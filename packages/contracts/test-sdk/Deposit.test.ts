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

        const totalValue = ONE_USDC;
        const fee = ONE_USDC.div(10)

        const response = await client.deposit(
            totalValue,
            fee,
            BigNumber.from(10).pow(9),
            wallet.address,
        );

        const receipt = await response.wait();

        const iTokenPredicate = new ethers.utils.Interface([
            "event LockedERC20(address indexed, address indexed, address indexed, uint256 amount)"
        ]);

        let parsed: any;
        for (let i = 0; i < receipt.logs.length; i += 1) {
            try {
                parsed = iTokenPredicate.parseLog(receipt.logs[i]);
            } catch (e) {}

            if (parsed) break;
        }

        expect(parsed.name).to.equal("LockedERC20");

        // token address
        expect(parsed.args[2].toLowerCase()).to.equal(getContracts(1).usdc.toLowerCase());

        // deposit receiver
        expect(parsed.args[1].toLowerCase()).to.equal(wallet.address.toLowerCase());

        // deposit amount
        expect(parsed.args[3].toString()).to.equal(totalValue.sub(fee).toString());
    });
});
