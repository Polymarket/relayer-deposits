/* eslint-disable func-names */
import { expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { fundAccountETH, fundAccountUSDC } from "mainnet-fork-helpers";

import { getReceiveSignature, getEip3009Nonce, Signature } from "../sdk";
import { getContracts } from "../config";

const { usdc } = getContracts(1);

const wallet = ethers.Wallet.createRandom().connect(ethers.provider);

const ONE_ETH = BigNumber.from(10).pow(18);

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
        const validBefore = Math.floor(Date.now() / 1000 + 3600);

        const value = ONE_ETH;

        const nonce = await getEip3009Nonce(wallet, usdc);

        const receiveSig = await getReceiveSignature({
            signer: wallet,
            tokenName: "USD Coin",
            contractVersion: "2",
            chainId: 1,
            verifyingContract: usdc,
            to: "0x60A4A8A77198D798D21d8D0299DDBbb9F24353B9",
            value,
            nonce,
            validBefore,
            validAfter: 0,
        });

        const request = {
            receiveSig,
            from: wallet.address,
            depositRecipient: wallet.address,
            totalValue: value.toHexString(),
            fee: ONE_ETH.div(10).toHexString(),
            validBefore,
            nonce,
            gasPrice: ONE_ETH.div(BigNumber.from(10).pow(9)).toHexString(),
            chainId: 31337
        }

        console.log({ request });
    });
});
