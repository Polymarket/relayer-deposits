/* eslint-disable func-names */
import { expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { splitSignature } from "@ethersproject/bytes";
import { JsonRpcSigner } from "@ethersproject/providers";
import { getReceiveSignature, getDepositSignature, Signature } from "@polymarket/relayer-deposits";

import { DepositRouter, TestToken } from "../typechain";
import { deploy, deployMock, getSignerFromWallet } from "./helpers";

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

    const stakeAmount = BigNumber.from(10).pow(18).mul(2); // stake amount 2

    const router = await deploy<DepositRouter>("DepositRouter", {
        args: [testToken.address, rootChainManagerMock.address, predicateContract, admin.address, stakeAmount],
        connect: admin,
    });

    return {
        router,
        testToken,
        admin,
        tokenName,
        predicateContract,
        tokenVersion,
        stakeAmount,
    };
});

describe("Unit tests", function () {
    describe("DepositRouter", function () {
        let router: DepositRouter;
        let testToken: TestToken;
        let admin: SignerWithAddress;
        let signer: JsonRpcSigner;
        let tokenName: string;
        let predicateContract: string;
        let tokenVersion: string;
        let stakeAmount: BigNumber;

        beforeEach(async function () {
            const deployment = await setup();
            router = deployment.router;
            testToken = deployment.testToken;
            admin = deployment.admin;
            signer = getSignerFromWallet(admin, 31337);
            tokenName = deployment.tokenName;
            predicateContract = deployment.predicateContract;
            tokenVersion = deployment.tokenVersion;
            stakeAmount = deployment.stakeAmount;
        });

        describe("set up as expected", function () {
            it("owner is the admin", async () => {
                const owner = await router.owner();

                expect(owner).to.equal(admin.address);
            });

            it("stake amount is the stake amount", async () => {
                const returnedStakeAmount = await router.stakeAmount();

                expect(returnedStakeAmount.toString()).to.equal(stakeAmount.toString());
            });

            it("deposit router has approved the predicate contract max uint256", async function () {
                const allowance = await testToken.allowance(router.address, predicateContract);
                expect(allowance.toString()).to.equal(ethers.constants.MaxUint256.toString());
            });
        });

        describe("register and deregister", function () {
            it("registers a relayer", async () => {
                const url = "url string";

                await expect(router.register(url, { value: stakeAmount }))
                    .to.emit(router, "RegisterRelay")
                    .withArgs(admin.address, url);
            });

            it("isRegistered is true after registering", async () => {
                const tx = await router.register("blah blah", { value: stakeAmount });
                await tx.wait();

                const isRegistered = await router.isRegistered(admin.address);

                expect(isRegistered).to.equal(true);
            });

            it("can get url of relayer", async () => {
                const url = "url";
                const tx = await router.register(url, { value: stakeAmount });
                await tx.wait();

                const returnedUrl = await router.relayerUrl(admin.address);
                expect(returnedUrl).to.equal(url);
            });

            it("can retrieve all relayers with their urls", async () => {
                const url = "url";
                const response = await router.register(url, { value: stakeAmount });
                await response.wait();

                const [relayerInfo] = await router.getRelayersWithUrls();
                const [returnedAddress, returnedUrl] = ethers.utils.defaultAbiCoder.decode(
                    ["address", "string"],
                    relayerInfo,
                );

                expect(returnedAddress).to.equal(admin.address);
                expect(returnedUrl).to.equal(url);
            });

            it("relayer can be viewed after registering", async () => {
                const response = await router.register("insignificant url", { value: stakeAmount });
                await response.wait();

                const relayers = await router.getRelayers();

                expect(relayers.length).to.equal(1);
                expect(relayers[0]).to.equal(admin.address);
            });

            it("relayer refunded excess value", async () => {
                const balanceBefore = await ethers.provider.getBalance(admin.address);

                const tx = await router.register("insignificant url", { value: stakeAmount.mul(2) });
                const receipt = await tx.wait();

                const balanceAfter = await ethers.provider.getBalance(admin.address);

                const txCost = receipt.gasUsed.mul(network.config.gasPrice);
                const difference = balanceBefore.sub(balanceAfter).sub(txCost);

                expect(difference.toString()).to.equal(stakeAmount.toString());
            });

            it("relayer can deregister", async () => {
                const tx = await router.register("some url", { value: stakeAmount });
                await tx.wait();

                await expect(router.deregister())
                    .to.emit(router, "DeregisterRelay")
                    .withArgs(admin.address, admin.address);
            });

            it("deregister deletes the relayer url", async () => {
                const tx = await router.register("some url", { value: stakeAmount });
                await tx.wait();

                const dTx = await router.deregister();
                await dTx.wait();

                const url = await router.relayerUrl(admin.address);
                expect(url).to.equal("");
            });

            it("isRegistered is false after deregistering", async () => {
                const tx = await router.register("some url", { value: stakeAmount });
                await tx.wait();

                let isRegistered = await router.isRegistered(admin.address);

                expect(isRegistered).to.equal(true);

                const dTx = await router.deregister();
                await dTx.wait();

                isRegistered = await router.isRegistered(admin.address);
                expect(isRegistered).to.equal(false);
            });

            it("deregister returns the relayer stake", async () => {
                const tx = await router.register("some url", { value: stakeAmount });
                await tx.wait();

                const balanceBefore = await ethers.provider.getBalance(admin.address);

                const dTx = await router.deregister();
                const receipt = await dTx.wait();

                const balanceAfter = await ethers.provider.getBalance(admin.address);

                const txCost = receipt.gasUsed.mul(network.config.gasPrice);

                // difference between balances, accounting for tx cost
                const diff = balanceAfter.sub(balanceBefore).add(txCost);

                expect(diff.toString()).to.equal(stakeAmount.toString());
            });

            it("register reverts with insufficient stake", async () => {
                await expect(router.register("some url", { value: stakeAmount.div(2) })).to.be.revertedWith(
                    "DepositRouter:register: insufficient stake amount",
                );
            });

            it("register reverts if already registered", async () => {
                const tx = await router.register("someurl", { value: stakeAmount });
                await tx.wait();

                await expect(router.register("someurl", { value: stakeAmount })).to.be.revertedWith(
                    "DepositRouter::register: relay already registered",
                );
            });

            it("deregister reverts if router is not registered", async () => {
                await expect(router.deregister()).to.be.revertedWith(
                    "DepositRouter::deregister: relay is not already registered",
                );
            });

            it("can change url", async () => {
                let tx = await router.register("someurl", { value: stakeAmount });
                await tx.wait();

                const newUrl = "new Url";
                tx = await router.setRelayerUrl(newUrl);
                await tx.wait();

                const returnedUrl = await router.relayerUrl(admin.address);
                expect(returnedUrl).to.equal(newUrl);
            });

            it("fails to change url on unregistered relay", async () => {
                await expect(router.setRelayerUrl("blah")).to.be.revertedWith(
                    "DepositRouter::setRelayerUrl: relay must be registered to change its url",
                );
            });
        });

        describe("owner functions", function () {
            it("owner can change the stake amount", async () => {
                const newStakeAmount = stakeAmount.mul(2);

                const tx = await router.setStakeAmount(newStakeAmount);
                await tx.wait();

                const returnedStakeAmount = await router.stakeAmount();

                expect(returnedStakeAmount.toString()).to.equal(newStakeAmount.toString());
            });

            it("reverts if not called by owner", async () => {
                const nonAdminSigner = (await ethers.getSigners())[5];

                expect(router.connect(nonAdminSigner).setStakeAmount(1)).to.be.revertedWith(
                    "Ownable: caller is not the owner",
                );
            });

            it("owner can deregister a relayer", async () => {
                const nonAdminSigner = (await ethers.getSigners())[5];

                const tx = await router.connect(nonAdminSigner).register("random", { value: stakeAmount });
                await tx.wait();

                await expect(router.adminDeregister(nonAdminSigner.address))
                    .to.emit(router, "DeregisterRelay")
                    .withArgs(nonAdminSigner.address, admin.address);
            });

            it("reverts when non admin tries to call adminDeregister", async () => {
                const nonAdminSigner = (await ethers.getSigners())[5];

                await expect(router.connect(nonAdminSigner).adminDeregister(nonAdminSigner.address)).to.be.revertedWith(
                    "Ownable: caller is not the owner",
                );
            });
        });

        describe("deposits and claims", function () {
            let validBefore: number;
            const depositAmount = ethers.constants.WeiPerEther;
            const fee = depositAmount.div(1000);
            let nonce: string;

            let receiveSig: Signature;
            let depositSig: Signature;
            let maxBlock: BigNumber;

            beforeEach(async () => {
                const tx = await router.register("random url", { value: stakeAmount });
                await tx.wait();

                validBefore = Math.floor(Date.now() / 1000 + 3600);
                nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32));

                receiveSig = splitSignature(
                    await getReceiveSignature({
                        signer,
                        tokenName,
                        contractVersion: tokenVersion,
                        chainId: 31337,
                        verifyingContract: testToken.address,
                        to: router.address,
                        value: depositAmount,
                        nonce,
                        validBefore,
                        validAfter: 0,
                    }),
                );

                const depositNonce = await router.nonces(admin.address);
                const currentBlock = await ethers.provider.getBlockNumber();

                maxBlock = BigNumber.from(currentBlock + 10);

                depositSig = splitSignature(
                    await getDepositSignature({
                        signer,
                        chainId: 31337,
                        verifyingContract: router.address,
                        relayer: admin.address,
                        depositRecipient: admin.address,
                        fee,
                        maxBlock,
                        nonce: depositNonce,
                    }),
                );
            });

            it("should transfer tokens to the deposit contract", async () => {
                expect(
                    await router.deposit(
                        admin.address,
                        admin.address,
                        depositAmount,
                        fee,
                        validBefore,
                        nonce,
                        maxBlock,
                        receiveSig,
                        depositSig,
                    ),
                )
                    .to.emit(testToken, "Transfer")
                    .withArgs(admin.address, router.address, depositAmount);
            });

            it("emits deposit event", async () => {
                await expect(
                    router.deposit(
                        admin.address,
                        admin.address,
                        depositAmount,
                        fee,
                        validBefore,
                        nonce,
                        maxBlock,
                        receiveSig,
                        depositSig,
                    ),
                )
                    .to.emit(router, "DepositRelayed")
                    .withArgs(admin.address, admin.address, depositAmount.sub(fee), fee);
            });

            it("reverts when called by unregistered account", async () => {
                const nonAdminSigner = (await ethers.getSigners())[5];

                await expect(
                    router
                        .connect(nonAdminSigner)
                        .deposit(
                            admin.address,
                            admin.address,
                            depositAmount,
                            fee,
                            validBefore,
                            nonce,
                            maxBlock,
                            receiveSig,
                            depositSig,
                        ),
                ).to.be.revertedWith("DepositRouter::deposit: relayer is not registered");
            });

            it("updates fees and allows claim after deposit", async () => {
                const tx = await router.deposit(
                    admin.address,
                    admin.address,
                    depositAmount,
                    fee,
                    validBefore,
                    nonce,
                    maxBlock,
                    receiveSig,
                    depositSig,
                );
                await tx.wait();

                const claimableFees = await router.fees(admin.address);
                expect(claimableFees.toString()).to.equal(fee.toString());

                await expect(router.claimFees(admin.address, fee))
                    .to.emit(testToken, "Transfer")
                    .withArgs(router.address, admin.address, fee);
            });

            it("reverts trying to claim more fees than a relayer has", async () => {
                const tx = await router.deposit(
                    admin.address,
                    admin.address,
                    depositAmount,
                    fee,
                    validBefore,
                    nonce,
                    maxBlock,
                    receiveSig,
                    depositSig,
                );
                await tx.wait();

                const claimableFees = await router.fees(admin.address);
                expect(claimableFees.toString()).to.equal(fee.toString());

                await expect(router.claimFees(admin.address, fee.mul(2))).to.be.revertedWith(
                    "DepositRouter::claimFees: cannot claim more fees than the accout has",
                );
            });

            it("reverts when the max block is too low", async () => {
                await expect(
                    router.deposit(
                        admin.address,
                        admin.address,
                        depositAmount,
                        fee,
                        validBefore,
                        nonce,
                        maxBlock.sub(100),
                        receiveSig,
                        depositSig,
                    ),
                ).to.be.revertedWith("DepositRouter::deposit: cannot relay transaction after max block");
            });
        });
    });
});
