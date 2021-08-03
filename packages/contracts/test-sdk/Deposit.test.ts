/* eslint-disable func-names */
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { JsonRpcSigner } from "@ethersproject/providers";
import { fundAccountETH, fundAccountUSDC } from "mainnet-fork-helpers";

import { getContracts, DepositClient, getGasPriceAndFee } from "@polymarket/relayer-deposits";
import { getSignerFromWallet } from "../test/helpers/utils";
import { getRemoteNetworkConfig } from "../config";

describe("Deposit Relayer", () => {
    const { usdc } = getContracts(1);

    const ONE_ETH = BigNumber.from(10).pow(18);
    const ONE_USDC = BigNumber.from(10).pow(6);
    const HARDHAT_NETWORK = 31337;

    const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
    const signer: JsonRpcSigner = getSignerFromWallet(wallet, HARDHAT_NETWORK);

    before(async () => {
        const relayerWallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC as string);
        // fund relayer
        await fundAccountETH(relayerWallet.address, ONE_ETH.mul(100000), network.provider, ethers.getSigner);

        await fundAccountETH(wallet.address, ONE_ETH.mul(10), network.provider, ethers.getSigner);

        await fundAccountUSDC(wallet, ONE_ETH.mul(9), usdc);
    });

    it("can make a deposit", async () => {
        const client = new DepositClient(signer, "http://localhost:5555", HARDHAT_NETWORK);

        const mainnetProvider = new ethers.providers.JsonRpcProvider(getRemoteNetworkConfig("mainnet").url);
        const { gasPrice, fee } = await getGasPriceAndFee(mainnetProvider, {
            gasStationKey: process.env.GAS_STATION_API_KEY,
        });

        const totalValue = fee.mul(10); // deposit 10x the fee so even when gasPrices are high we always deposit more than the fee

        let response;
        try {
            response = await client.deposit(totalValue, fee, gasPrice, wallet.address);
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

    it("fails when fee is more than the deposit amount", async () => {
        const client = new DepositClient(signer, "http://localhost:5555", HARDHAT_NETWORK);

        try {
            await client.deposit(
                ONE_USDC, // total deposit amount
                ONE_USDC.add(1), // fee
                ONE_USDC, // gas price
                wallet.address,
            );

            // fails if it gets here
            expect(true).to.equal(false);
        } catch (error) {
            expect(error.response.status).to.equal(400);
            expect(error.response.data).to.equal("Deposit amount must be greater than the fee");
        }
    });

    it("fails when gas price provided to too low", async () => {
        const client = new DepositClient(signer, "http://localhost:5555", HARDHAT_NETWORK);

        const mainnetProvider = new ethers.providers.JsonRpcProvider(getRemoteNetworkConfig("mainnet").url);
        const { gasPrice, fee } = await getGasPriceAndFee(mainnetProvider, {
            gasStationKey: process.env.GAS_STATION_API_KEY,
        });

        const totalValue = fee.mul(10);

        try {
            await client.deposit(totalValue, fee, gasPrice.div(10), wallet.address);

            // fails if it gets here
            expect(true).to.equal(false);
        } catch (error) {
            expect(error.response.status).to.equal(400);
            expect(error.response.data).to.equal("Gas price lower than minimum accepted.");
        }
    });

    it("fails if the fee provided is too low", async () => {
        const client = new DepositClient(signer, "http://localhost:5555", HARDHAT_NETWORK);

        const mainnetProvider = new ethers.providers.JsonRpcProvider(getRemoteNetworkConfig("mainnet").url);
        const { gasPrice, fee } = await getGasPriceAndFee(mainnetProvider, {
            gasStationKey: process.env.GAS_STATION_API_KEY,
        });

        const totalValue = fee.mul(10);

        try {
            await client.deposit(totalValue, fee.div(10), gasPrice, wallet.address);

            // fails if it gets here
            expect(true).to.equal(false);
        } catch (error) {
            expect(error.response.status).to.equal(400);
            expect(error.response.data).to.equal("Fee lower than minimum accepted fee.");
        }
    });
});
