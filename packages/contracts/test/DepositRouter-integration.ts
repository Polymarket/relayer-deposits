/* eslint-disable func-names */
import { expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { fundAccountETH, fundAccountUSDC } from "mainnet-fork-helpers";
import { splitSignature } from "@ethersproject/bytes";
import { JsonRpcSigner } from "@ethersproject/providers";
import {
    getReceiveSignature,
    getEip3009Nonce,
    Signature,
    getContracts,
    getDepositSignature,
} from "@polymarket/relayer-deposits";

import { DepositRouter } from "../typechain";
import { deploy, getSignerFromWallet } from "./helpers";

const { usdc, rootChainManager, usdcPredicate } = getContracts(1);

const ONE_USDC = BigNumber.from(10).pow(6);
const ONE_ETH = BigNumber.from(10).pow(18);

const setup = deployments.createFixture(async () => {
    const admin = await ethers.getNamedSigner("admin");

    const usdcContract = new ethers.Contract(
        usdc,
        ["function transfer(address, uint256) public", "function balanceOf(address) public view returns (uint256)"],
        ethers.provider,
    );

    await fundAccountETH(admin.address, ONE_ETH.mul(100000), network.provider, ethers.getSigner);
    await fundAccountUSDC(admin, ONE_ETH.mul(10), usdc);

    const router = await deploy<DepositRouter>("DepositRouter", {
        args: [usdc, rootChainManager, usdcPredicate, admin.address, ONE_ETH.mul(2)],
        connect: admin,
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
        let signer: JsonRpcSigner;

        let validBefore: number;
        let value: BigNumber;
        let fee: BigNumber;
        let receiveNonce: string;
        let receiveSig: Signature;
        let depositSig: Signature;
        let maxBlock: BigNumber;

        beforeEach(async function () {
            const deployment = await setup();
            router = deployment.router;
            usdcContract = deployment.usdcContract;
            admin = deployment.admin;
            signer = getSignerFromWallet(admin, 31337);

            validBefore = Math.floor(Date.now() / 1000 + 3600);

            value = ONE_USDC;
            fee = ONE_USDC.div(10);

            const registerTx = await router.register("some url", { value: ONE_ETH.mul(2) });
            await registerTx.wait();

            receiveNonce = await getEip3009Nonce(admin, usdc);
            receiveSig = splitSignature(
                await getReceiveSignature({
                    signer,
                    tokenName: "USD Coin",
                    contractVersion: "2",
                    chainId: 1,
                    verifyingContract: usdc,
                    to: router.address,
                    value,
                    nonce: receiveNonce,
                    validBefore,
                    validAfter: 0,
                }),
            );

            const currentBlock = await ethers.provider.getBlockNumber();
            maxBlock = BigNumber.from(currentBlock + 10);

            const depositNonce = await router.nonces(admin.address);

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

        it("should execute the deposit", async function () {
            const predicate = new ethers.Contract(
                usdcPredicate,
                ["event LockedERC20(address indexed, address indexed, address indexed, uint256 amount)"],
                ethers.provider,
            );

            await expect(
                router.deposit(
                    admin.address,
                    admin.address,
                    value,
                    fee,
                    validBefore,
                    receiveNonce,
                    maxBlock,
                    receiveSig,
                    depositSig,
                ),
            )
                .to.emit(predicate, "LockedERC20")
                .withArgs(router.address, admin.address, usdc, value.sub(fee));
        });

        it("able to make multiple deposits", async () => {
            const predicate = new ethers.Contract(
                usdcPredicate,
                ["event LockedERC20(address indexed, address indexed, address indexed, uint256 amount)"],
                ethers.provider,
            );

            await expect(
                router.deposit(
                    admin.address,
                    admin.address,
                    value,
                    fee,
                    validBefore,
                    receiveNonce,
                    maxBlock,
                    receiveSig,
                    depositSig,
                ),
            )
                .to.emit(predicate, "LockedERC20")
                .withArgs(router.address, admin.address, usdc, value.sub(fee));

            receiveNonce = await getEip3009Nonce(admin, usdc);
            receiveSig = splitSignature(
                await getReceiveSignature({
                    signer,
                    tokenName: "USD Coin",
                    contractVersion: "2",
                    chainId: 1,
                    verifyingContract: usdc,
                    to: router.address,
                    value,
                    nonce: receiveNonce,
                    validBefore,
                    validAfter: 0,
                }),
            );

            const depositNonce = await router.nonces(admin.address);

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

            await expect(
                router.deposit(
                    admin.address,
                    admin.address,
                    value,
                    fee,
                    validBefore,
                    receiveNonce,
                    maxBlock,
                    receiveSig,
                    depositSig,
                ),
            )
                .to.emit(predicate, "LockedERC20")
                .withArgs(router.address, admin.address, usdc, value.sub(fee));
        });

        it("deposit router has a balance of the fee after the deposit", async () => {
            const tx = await router.deposit(
                admin.address,
                admin.address,
                value,
                fee,
                validBefore,
                receiveNonce,
                maxBlock,
                receiveSig,
                depositSig,
            );
            await tx.wait();

            const balance = await usdcContract.balanceOf(router.address);
            expect(balance.toString()).to.equal(fee.toString());
        });

        it("initial transfer reverts if the deposit does not succeed", async () => {
            const expectZeroBalance = async (): Promise<void> => {
                const routerBalance = await usdcContract.balanceOf(router.address);
                expect(routerBalance.toString()).to.equal(ethers.constants.Zero.toString());
            };

            await expectZeroBalance();

            const depositNonce = await router.nonces(admin.address);

            depositSig = splitSignature(
                await getDepositSignature({
                    signer,
                    chainId: 31337,
                    verifyingContract: router.address,
                    relayer: admin.address,
                    depositRecipient: ethers.constants.AddressZero,
                    fee,
                    maxBlock,
                    nonce: depositNonce,
                }),
            );

            await expect(
                router.deposit(
                    admin.address,
                    ethers.constants.AddressZero,
                    value,
                    fee,
                    validBefore,
                    receiveNonce,
                    maxBlock,
                    receiveSig,
                    depositSig,
                ),
            ).to.be.revertedWith("RootChainManager: INVALID_USER");

            await expectZeroBalance();
        });

        it("fails on reused deposit signature", async () => {
            const tx = await router.deposit(
                admin.address,
                admin.address,
                value,
                fee,
                validBefore,
                receiveNonce,
                maxBlock,
                receiveSig,
                depositSig,
            );
            await tx.wait();

            await expect(
                router.deposit(
                    admin.address,
                    admin.address,
                    value,
                    fee,
                    validBefore,
                    receiveNonce,
                    maxBlock,
                    receiveSig,
                    depositSig,
                ),
            ).to.be.revertedWith("DepositRouter::_verifyDepositSig: unable to verify deposit sig");
        });

        it("fails on reused receive signature", async () => {
            const tx = await router.deposit(
                admin.address,
                admin.address,
                value,
                fee,
                validBefore,
                receiveNonce,
                maxBlock,
                receiveSig,
                depositSig,
            );
            await tx.wait();

            const depositNonce = await router.nonces(admin.address);

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

            await expect(
                router.deposit(
                    admin.address,
                    admin.address,
                    value,
                    fee,
                    validBefore,
                    receiveNonce,
                    maxBlock,
                    receiveSig,
                    depositSig,
                ),
            ).to.be.revertedWith("FiatTokenV2: authorization is used or canceled");
        });
    });
});
