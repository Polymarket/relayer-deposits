/* eslint-disable func-names */
import { expect } from "chai";
import { MockContract } from "ethereum-waffle";
import { deployments, ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

import { DepositRouter, TestToken } from "../typechain";
import { getReceiveSignature, getEip3009Nonce, getDepositSignature, Signature } from "../src";
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
        args: [testToken.address, rootChainManagerMock.address, predicateContract, admin.address],
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
        let depositSig: Signature;
        let depositAmount: BigNumber;
        let fee: BigNumber;

        before(async function () {
            const deployment = await setup();
            router = deployment.router;
            testToken = deployment.testToken;
            admin = deployment.admin;
            tokenName = deployment.tokenName;
            predicateContract = deployment.predicateContract;
            tokenVersion = deployment.tokenVersion;
        });

        it("has the expected domain separator", async () => {
            const domain = {
                name: await router.name(),
                chainId: 31337,
                verifyingContract: router.address,
            };

            const expectedSeparator = ethers.utils._TypedDataEncoder.hashDomain(domain);

            const returnedSeparator = await router.domainSeparator();

            expect(returnedSeparator).to.equal(expectedSeparator);
        });

        it("is owned by the admin", async () => {
            expect(await router.owner()).to.equal(admin.address);
        })

        it("deposit router has approved the predicate contract max uint256", async function () {
            const allowance = await testToken.allowance(router.address, predicateContract)
            expect(allowance.toString()).to.equal(ethers.constants.MaxUint256.toString());
        });

        it("should transfer tokens to the deposit contract", async function () {
            const validBefore = Math.floor(Date.now() / 1000 + 3600);

            depositAmount = ethers.constants.WeiPerEther;
            fee = ethers.constants.WeiPerEther.div(1000);

            const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32));

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

            depositSig = await getDepositSignature({
                signer: admin,
                contractName: await router.name(),
                chainId: 31337,
                verifyingContract: router.address,
                depositRecipient: admin.address,
                totalValue: depositAmount,
                fee,
                nonce: await router.nonces(admin.address),
            });

            expect (await router.deposit(
                admin.address,
                admin.address,
                depositAmount,
                fee,
                validBefore,
                nonce,
                receiveSig,
                depositSig
            )).to.emit(testToken, "Transfer").withArgs(admin.address, router.address, depositAmount);
        });

        it("reverts when reusing the signature", async () => {
            await expect(router.deposit(
                admin.address,
                admin.address,
                depositAmount,
                fee,
                Math.floor(Date.now() / 1000 + 3600),
                ethers.utils.hexlify(ethers.utils.randomBytes(32)),
                receiveSig,
                depositSig,
            )).to.be.revertedWith("EIP712 invalid deposit signature");
        });

        it("owner is able to claim fees", async () => {
            await expect(router.claimFees(admin.address, 100)).to.emit(testToken, "Transfer").withArgs(router.address, admin.address, 100);
        });

        it("reverts when address other than owner tries to claim fees", async () => {
            const randomSigner = (await ethers.getSigners())[5];
            await expect(router.connect(randomSigner).claimFees(randomSigner.address, 100)).to.be.revertedWith("Ownable: caller is not the owner");
        })
    });
});
