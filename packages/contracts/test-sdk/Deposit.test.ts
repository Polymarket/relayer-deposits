/* eslint-disable func-names */
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber, Contract, Wallet } from "ethers";
import { JsonRpcSigner } from "@ethersproject/providers";
import { fundAccountETH, fundAccountUSDC } from "mainnet-fork-helpers";

import { getContracts, DepositClient, getGasPriceAndFee, Relayer, getRelayers } from "@polymarket/relayer-deposits";
import { getSignerFromWallet } from "../test/helpers/utils";
import { getRemoteNetworkConfig } from "../config";

describe("Deposit Relayer", () => {
    const { usdc } = getContracts(1);

    const ONE_ETH = BigNumber.from(10).pow(18);
    const HARDHAT_NETWORK = 31337;

    const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    const signer: JsonRpcSigner = getSignerFromWallet(wallet, HARDHAT_NETWORK);

    let relayerWallet: Wallet;

    let relayer: Relayer;

    let client: DepositClient;

    let gasPrice: BigNumber;
    let ethPrice: string;
    let fee: BigNumber;

    beforeEach(async () => {
        relayerWallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC as string);
        // fund relayer
        await fundAccountETH(relayerWallet.address, ONE_ETH.mul(100000), network.provider, ethers.getSigner);

        await fundAccountETH(wallet.address, ONE_ETH.mul(10), network.provider, ethers.getSigner);

        await fundAccountUSDC(wallet, ONE_ETH.mul(9), usdc);

        relayer = {
            address: relayerWallet.address,
            fee: 0.003,
            endpoint: "http://localhost:5555",
        };

        client = new DepositClient(signer, 0.003, HARDHAT_NETWORK);

        const mainnetProvider = new ethers.providers.JsonRpcProvider(getRemoteNetworkConfig("mainnet").url);
        const feeData = await getGasPriceAndFee(mainnetProvider, 0.003, {
            gasStationKey: process.env.GAS_STATION_API_KEY,
        });

        gasPrice = feeData.gasPrice;
        ethPrice = feeData.ethPrice;
        fee = feeData.fee;
    });

    it("can make a deposit", async () => {
        const totalValue = fee.mul(10); // deposit 10x the fee so even when gasPrices are high we always deposit more than the fee

        let response;
        try {
            response = await client.deposit(totalValue, ethPrice, gasPrice, wallet.address, [relayer]);
        } catch (e) {
            console.log("error in deposit", e);
            throw e;
        }

        const receipt = await response.wait();

        const iTokenPredicate = new ethers.utils.Interface([
            "event LockedERC20(address indexed, address indexed, address indexed, uint256 amount)",
        ]);

        let parsed: any;
        for (let i = 0; i < receipt.logs.length; i += 1) {
            try {
                parsed = iTokenPredicate.parseLog(receipt.logs[i]);
            } catch (e) {}

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

        const initialRelayer = relayers[0];

        expect(initialRelayer.address).to.equal(relayer.address);
    });

    // test that unresponsive relayer doesn't break it

    it("fails when fee is more than the deposit amount", async () => {
        const totalValue = fee; // deposit 10x the fee so even when gasPrices are high we always deposit more than the fee

        try {
            // fee is calculated base on ethPrice so if ethPrice is doubled so will the fee
            await client.deposit(totalValue, (parseFloat(ethPrice) * 2).toString(), gasPrice, wallet.address, [
                relayer,
            ]);

            // fails if it gets here
            expect(true).to.equal(false);
        } catch (error) {
            expect(error.errors[0]).to.equal(
                "Deposit failed with status code 400: Deposit amount must be greater than the fee",
            );
        }
    });

    it("fails when gas price provided to too low", async () => {
        const totalValue = fee; // deposit 10x the fee so even when gasPrices are high we always deposit more than the fee

        try {
            await client.deposit(totalValue, ethPrice, gasPrice.div(2), wallet.address, [relayer]);

            // fails if it gets here
            expect(true).to.equal(false);
        } catch (error) {
            expect(error.errors[0]).to.equal(
                "Deposit failed with status code 400: Gas price lower than minimum accepted.",
            );
        }
    });

    it("fails if the fee provided is too low", async () => {
        const totalValue = fee.mul(2);

        try {
            // fee is calculated base on ethPrice so dividing the ethPrice by 2 divides the fee by 2
            await client.deposit(totalValue, (parseFloat(ethPrice) / 2).toString(), gasPrice, wallet.address, [
                relayer,
            ]);

            // fails if it gets here
            expect(true).to.equal(false);
        } catch (error) {
            expect(error.errors[0]).to.equal(
                "Deposit failed with status code 400: Fee lower than minimum accepted fee.",
            );
        }
    });
});
