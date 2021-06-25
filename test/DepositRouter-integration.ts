/* eslint-disable func-names */
import { expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

import { DepositRouter } from "../typechain";
import { deploy, fundAccountETH, fundAccountUSDC, getReceiveSignature } from "./helpers";
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

describe("Integration tests", function () {
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
            const validBefore = Math.floor(Date.now() / 1000 + 3600);

            const value = ONE_USDC;

            const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32));

            const { v, r, s } = await getReceiveSignature({
                signer: admin,
                tokenName: "USD Coin",
                contractVersion: "2",
                chainId: 1,
                verifyingContract: usdc,
                to: router.address,
                value,
                nonce,
                validBefore,
                validAfter: 0,
            });

            const predicate = new ethers.Contract(usdcPredicate, [
                "event LockedERC20(address indexed, address indexed, address indexed, uint256 amount)"
            ], ethers.provider);

            await expect(router.deposit(
                admin.address,
                admin.address,
                value,
                validBefore,
                nonce,
                v,
                r,
                s
            )).to.emit(predicate, "LockedERC20").withArgs(router.address, admin.address, usdc, value);
        });
    });
});
