/* eslint-disable func-names */
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber, Wallet } from "ethers";
import { JsonRpcSigner } from "@ethersproject/providers";
import { fundAccountETH, fundAccountUSDC } from "mainnet-fork-helpers";

import { getContracts, DepositClient, getGasPriceAndFee, Relayer, getRelayers } from "@polymarket/relayer-deposits";
import { getSignerFromWallet } from "../test/helpers/utils";
import { getRemoteNetworkConfig } from "../config";

describe("Deposit Relayer", () => {
    const { usdc } = getContracts(1);

    const ONE_ETH = BigNumber.from(10).pow(18);
    const ONE_USDC = BigNumber.from(10).pow(6);
    const HARDHAT_NETWORK = 31337;

    const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    const signer: JsonRpcSigner = getSignerFromWallet(wallet, HARDHAT_NETWORK);

    let relayerWallet: Wallet;

    let relayer: Relayer;

    let client: DepositClient;

    let gasPrice: BigNumber;
    let ethPrice: string;
    let totalValue: BigNumber;
    let fee: BigNumber;

    let maxBlock: number;

    beforeEach(async () => {
        relayerWallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC as string);
        // fund relayer
        await fundAccountETH(relayerWallet.address, ONE_ETH.mul(100000), network.provider, ethers.getSigner);

        await fundAccountETH(wallet.address, ONE_ETH.mul(10), network.provider, ethers.getSigner);

        await fundAccountUSDC(wallet, ONE_ETH.mul(9), usdc);

        relayer = {
            address: relayerWallet.address,
            fees: { standardFee: 0.003, minFee: BigNumber.from(10).pow(6).mul(3).toHexString() },
            endpoint: "http://localhost:5555",
        };

        client = new DepositClient(signer, relayer.fees, HARDHAT_NETWORK);

        const mainnetProvider = new ethers.providers.JsonRpcProvider(getRemoteNetworkConfig("mainnet").url);

        totalValue = ONE_USDC.mul(1000);

        const feeData = await getGasPriceAndFee(mainnetProvider, relayer.fees, totalValue, {
            gasStationKey: process.env.GAS_STATION_API_KEY,
        });

        gasPrice = feeData.gasPrice;
        ethPrice = feeData.ethPrice;
        fee = feeData.fee;

        const currentBlock = await ethers.provider.getBlockNumber();
        maxBlock = currentBlock + 10;
    });

    it("can make a deposit", async () => {
        let response;
        try {
            response = await client.deposit({
                value: totalValue,
                ethPrice,
                gasPrice,
                maxBlock,
                depositRecipient: await signer.getAddress(),
                relayers: [relayer],
            });
        } catch (e) {
            console.log("error in deposit", e);
            throw e;
        }

        const receipt = await response.wait();

        const iTokenPredicate = new ethers.utils.Interface([
            "event LockedERC20(address indexed, address indexed, address indexed, uint256 amount)",
        ]);

        let parsed: any; // eslint-disable-line
        for (let i = 0; i < receipt.logs.length; i += 1) {
            try {
                parsed = iTokenPredicate.parseLog(receipt.logs[i]);
            } catch (e) {} // eslint-disable-line

            if (parsed) break;
        }

        const actualFee = BigNumber.from(response.fee);

        expect(parsed.name).to.equal("LockedERC20");

        // token address
        expect(parsed.args[2].toLowerCase()).to.equal(getContracts(1).usdc.toLowerCase());

        // deposit receiver
        expect(parsed.args[1].toLowerCase()).to.equal(wallet.address.toLowerCase());

        // deposit amount
        expect(parsed.args[3].toString()).to.equal(totalValue.sub(actualFee).toString());
    });

    it("get relayers returns the relayer", async () => {
        const relayers = await getRelayers(ethers.provider, HARDHAT_NETWORK);

        const foundRelayer = relayers.find((current: Relayer) => current.address === relayer.address);

        // will be undefined if it's not found
        expect(foundRelayer?.address).to.equal(relayer.address);
    });

    it("filters out relayers when fees are unacceptable", async () => {
        const relayers = await getRelayers(ethers.provider, HARDHAT_NETWORK, {
            standardFee: relayer.fees.standardFee + 0.001,
            minFee: BigNumber.from(relayer.fees.minFee).add(1).toHexString(),
        });

        expect(relayers.length).to.equal(0);
    });

    it("fails when fee is more than the deposit amount", async () => {
        totalValue = fee;

        try {
            // fee is calculated base on ethPrice so if ethPrice is doubled so will the fee
            await client.deposit({
                value: totalValue,
                ethPrice: (parseFloat(ethPrice) * 2).toString(),
                gasPrice,
                maxBlock,
                depositRecipient: wallet.address,
                relayers: [relayer],
            });

            // fails if it gets here
            expect(true).to.equal(false);
        } catch (error) {
            expect(error.errors[0]).to.equal(
                "Deposit failed with status code 400: Deposit amount must be greater than the fee",
            );
        }
    });

    it("fails when gas price provided to too low", async () => {
        totalValue = fee;

        try {
            await client.deposit({
                value: totalValue,
                ethPrice,
                gasPrice: gasPrice.div(2),
                maxBlock,
                depositRecipient: wallet.address,
                relayers: [relayer],
            });

            // fails if it gets here
            expect(true).to.equal(false);
        } catch (error) {
            expect(error.errors[0]).to.equal(
                "Deposit failed with status code 400: Gas price lower than minimum accepted.",
            );
        }
    });

    it("fails if the fee provided is too low", async () => {
        totalValue = fee.mul(2);

        try {
            // fee is calculated base on ethPrice so dividing the ethPrice by 2 divides the fee by 2
            await client.deposit({
                value: totalValue,
                ethPrice: (parseFloat(ethPrice) / 2).toString(),
                gasPrice,
                maxBlock,
                depositRecipient: wallet.address,
                relayers: [relayer],
            });

            // fails if it gets here
            expect(true).to.equal(false);
        } catch (error) {
            expect(error.errors[0]).to.equal(
                "Deposit failed with status code 400: Fee lower than minimum accepted fee.",
            );
        }
    });
});
