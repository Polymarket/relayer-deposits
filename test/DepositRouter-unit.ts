/* eslint-disable func-names */
import { expect } from "chai";
import { MockContract } from "ethereum-waffle";
import { deployments, ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

import { DepositRouter, TestToken } from "../typechain";
import { getReceiveSignature, getEip3009Nonce } from "../src";
import { deploy, deployMock } from "./helpers";

const setup = deployments.createFixture(async () => {

    const admin = await ethers.getNamedSigner("admin");

    const tokenName = "testToken";
    const tokenVersion = "1";

    const testToken = await deploy<TestToken>("TestToken", {
        from: admin.address,
        args: [tokenName, tokenVersion, "TST", 18, ethers.constants.WeiPerEther.mul(10000)],
        connect: admin,
    })

    const rootChainManagerMock = await deployMock("IRootChainManager");

    await rootChainManagerMock.mock.depositFor.returns();

    const predicateContract = ethers.Wallet.createRandom().address

    const router = await deploy<DepositRouter>("DepositRouter", {
        args: [testToken.address, rootChainManagerMock.address, predicateContract],
        connect: admin,
    });

    return {
        router,
        testToken,
        admin,
        tokenName,
        predicateContract,
        tokenVersion,
    };
});

describe("Unit tests", function () {
    describe("DepositRouter", function () {
        let router: DepositRouter;
        let testToken: TestToken;
        let admin: SignerWithAddress;
        let tokenName: string;
        let predicateContract: string;
        let tokenVersion: string;

        beforeEach(async function () {
            const deployment = await setup();
            router = deployment.router;
            testToken = deployment.testToken;
            admin = deployment.admin;
            tokenName = deployment.tokenName;
            predicateContract = deployment.predicateContract;
            tokenVersion = deployment.tokenVersion;
        });

        it("deposit router has approved the predicate contract max uint256", async function () {
            const allowance = await testToken.allowance(router.address, predicateContract)
            expect(allowance.toString()).to.equal(ethers.constants.MaxUint256.toString());
        })

        it("should transfer tokens to the deposit contract", async function () {
            const validBefore = Math.floor(Date.now() / 1000 + 3600);

            const depositAmount = ethers.constants.WeiPerEther;

            const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32));

            const { v, r, s } = await getReceiveSignature({
                signer: admin,
                tokenName,
                contractVersion: tokenVersion,
                chainId: 31337,
                verifyingContract: testToken.address,
                to: router.address,
                value: depositAmount,
                nonce,
                validBefore,
                validAfter: 0,
            });

            expect (await router.deposit(
                admin.address,
                admin.address,
                depositAmount,
                validBefore,
                nonce,
                v,
                r,
                s
            )).to.emit(testToken, "Transfer").withArgs(admin.address, router.address, depositAmount);
        });
    });
});
