/* eslint-disable func-names */
import { expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

import { DepositRouter } from "../typechain";
import { deploy, fundAccountETH, fundAccountUSDC } from "./helpers";
import { MAINNET_CONTRACTS } from "../config";

const { usdc, rootChainManager, usdcPredicate } = MAINNET_CONTRACTS;

const ONE_USDC = BigNumber.from(10).pow(6);

const setup = deployments.createFixture(async () => {

    const admin = await ethers.getNamedSigner("admin");

    const ONE_ETH = BigNumber.from(10).pow(18).mul(10);

    const usdcContract = new ethers.Contract(
        usdc,
        [
            "function transfer(address, uint256) public",
            "function nonces(address) public view returns (uint256)",
        ],
        ethers.provider
    );

    await fundAccountETH(admin.address, ONE_ETH.mul(100000));

    await fundAccountUSDC(admin, ONE_ETH.mul(10), usdc);

    const router = await deploy<DepositRouter>("DepositRouter", {
        args: [usdc, rootChainManager, usdcPredicate],
        connect: admin
    });

    return {
        router,
        usdcContract,
        admin,
    };
});

describe("Unit tests", function () {
    describe("DepositRouter", function () {
        let router: DepositRouter;
        let usdcContract: Contract;
        let admin: SignerWithAddress;

        beforeEach(async function () {
            const deployment = await setup();
            router = deployment.router;
            usdcContract = deployment.usdcContract;
            admin = deployment.admin;
        });

        it("should execute the deposit", async function () {
            const domain = {
                name: "USD Coin",
                version: "2",
                chainId: 31337,
                verifyingContract: usdc
            };

            const types = {
                Permit: [
                    { name: "owner", type: "address" },
	                { name: "spender", type: "address" },
	                { name: "value", type: "uint256" },
	                { name: "nonce", type: "uint256" },
	                { name: "deadline", type: "uint256" },
                ]
            };

            const deadline = Math.floor(Date.now() / 1000 + 3600);

            const value = ONE_USDC

            console.log({ nonce: await usdcContract.nonces(admin.address) })

            const value = {
                owner: admin.address,
                spender: usdcPredicate,
                value,
                nonce: await usdcContract.nonces(admin.address),
                deadline
            };

            console.log({ value });

            const signature = await admin._signTypedData(domain, types, value);

            const { v, r, s } = ethers.utils.splitSignature(signature);

            await router.permitAndDeposit(
                admin.address,
                value,
                deadline,
                v,
                r,
                s
            );
        });
    });
});
