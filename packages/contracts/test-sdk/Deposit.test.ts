/* eslint-disable func-names */
import { expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { fundAccountETH, fundAccountUSDC } from "mainnet-fork-helpers";
import axios from "axios";

import { getReceiveSignature, getEip3009Nonce, getContracts, DepositClient } from "../sdk";

const { usdc } = getContracts(1);

const wallet = ethers.Wallet.createRandom().connect(ethers.provider);

const ONE_ETH = BigNumber.from(10).pow(18);
const ONE_USDC = BigNumber.from(10).pow(6);

describe("Deposit Relayer", () => {
    before(async () => {
        // fund relayer
        await fundAccountETH(
            "0x1C35E441b21E528Dd8385Fd41d1578bE18E247D3",
            ONE_ETH.mul(100000),
            network.provider,
            ethers.getSigner,
        );

        await fundAccountETH(
            wallet.address,
            ONE_ETH.mul(10),
            network.provider,
            ethers.getSigner,
        );

        await fundAccountUSDC(wallet, ONE_ETH.mul(9), usdc);
    })

    it("can make a deposit", async () => {
        const client = new DepositClient(wallet, "http://localhost:5555", 31337);

        const res = await client.deposit(
            ONE_USDC,
            ONE_USDC.div(10),
            BigNumber.from(10).pow(9),
            wallet.address,
        );

        console.log({ res });
    });
});
