/* eslint-disable func-names */
import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

import { DepositRouter, TestToken } from "../typechain";
import { getReceiveSignature, Signature } from "../src";
import { deploy, deployMock } from "./helpers";

const setup = deployments.createFixture(async () => {
    const admin = await ethers.getNamedSigner("admin");

    const tokenName = "testToken";
    const tokenVersion = "1";

    const testToken = await deploy<TestToken>("TestToken", {
        from: admin.address,
        args: [tokenName, tokenVersion, "TST", 18, ethers.constants.WeiPerEther.mul(10000)],
        connect: admin,
    });

    const rootChainManagerMock = await deployMock("IRootChainManager");

    await rootChainManagerMock.mock.depositFor.returns();

    const predicateContract = ethers.Wallet.createRandom().address;

    const router = await deploy<DepositRouter>("DepositRouter", {
        args: [testToken.address, rootChainManagerMock.address, predicateContract, admin.address, [admin.address]],
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

        let receiveSig: Signature;
        let depositAmount: BigNumber;
        let fee: BigNumber;
        let validBefore: number;
        let nonce: string;

        const ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const RELAYER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("RELAYER_ROLE"));

        before(async function () {
            const deployment = await setup();
            router = deployment.router;
            testToken = deployment.testToken;
            admin = deployment.admin;
            tokenName = deployment.tokenName;
            predicateContract = deployment.predicateContract;
            tokenVersion = deployment.tokenVersion;
        });

        it("admin is the admin", async () => {
            const defaultAdminRole = await router.DEFAULT_ADMIN_ROLE();

            expect(defaultAdminRole).to.equal(ADMIN_ROLE);

            expect(await router.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
        });

        it("admin has the relayer role", async () => {
            const relayerRole = await router.RELAYER_ROLE();

            expect(relayerRole).to.equal(RELAYER_ROLE);

            expect(await router.hasRole(relayerRole, admin.address)).to.equal(true);
        });

        it("deposit router has approved the predicate contract max uint256", async function () {
            const allowance = await testToken.allowance(router.address, predicateContract);
            expect(allowance.toString()).to.equal(ethers.constants.MaxUint256.toString());
        });

        it("should transfer tokens to the deposit contract", async function () {
            validBefore = Math.floor(Date.now() / 1000 + 3600);

            depositAmount = ethers.constants.WeiPerEther;
            fee = ethers.constants.WeiPerEther.div(1000);

            nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32));

            receiveSig = await getReceiveSignature({
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

            expect(
                await router.deposit(admin.address, admin.address, depositAmount, fee, validBefore, nonce, receiveSig),
            )
                .to.emit(testToken, "Transfer")
                .withArgs(admin.address, router.address, depositAmount);
        });

        it("owner is able to claim fees", async () => {
            await expect(router.claimFees(admin.address, 100))
                .to.emit(testToken, "Transfer")
                .withArgs(router.address, admin.address, 100);
        });

        it("reverts when address other than admin tries to claim fees", async () => {
            const randomSigner = (await ethers.getSigners())[5];
            await expect(router.connect(randomSigner).claimFees(randomSigner.address, 100)).to.be.revertedWith(
                `AccessControl: account ${randomSigner.address.toLowerCase()} is missing role ${ADMIN_ROLE}`,
            );
        });

        it("reverts when address other than a relayer tries to deposit", async () => {
            const randomSigner = (await ethers.getSigners())[5];

            // reusing same data as previous deposit for simplicity
            await expect(
                router
                    .connect(randomSigner)
                    .deposit(admin.address, admin.address, depositAmount, fee, validBefore, nonce, receiveSig),
            ).to.be.revertedWith(
                `AccessControl: account ${randomSigner.address.toLowerCase()} is missing role ${RELAYER_ROLE}`,
            );
        });
    });
});
