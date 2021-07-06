/* eslint-disable func-names */
import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { getReceiveSignature, getEip3009Nonce, Signature } from "@polymarket/deposit-relayer-sdk";

import { DepositRouter } from "../typechain";
import { deploy, fundAccountETH, fundAccountUSDC } from "./helpers";
import { getContracts } from "../config";

const { usdc, rootChainManager, usdcPredicate } = getContracts(1);

const ONE_USDC = BigNumber.from(10).pow(6);

const setup = deployments.createFixture(async () => {
    const admin = await ethers.getNamedSigner("admin");
    const ONE_ETH = BigNumber.from(10).pow(18).mul(10);

    const usdcContract = new ethers.Contract(
        usdc,
        ["function transfer(address, uint256) public", "function balanceOf(address) public view returns (uint256)"],
        ethers.provider,
    );

    await fundAccountETH(admin.address, ONE_ETH.mul(100000));
    await fundAccountUSDC(admin, ONE_ETH.mul(10), usdc);

    const router = await deploy<DepositRouter>("DepositRouter", {
        args: [usdc, rootChainManager, usdcPredicate, admin.address, [admin.address]],
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

        let reusedReceiveSig: Signature;

        let fee: BigNumber;
        let reusedValue: BigNumber;
        let reusedNonce: string;
        let reusedValidBefore: number;

        before(async function () {
            const deployment = await setup();
            router = deployment.router;
            usdcContract = deployment.usdcContract;
            admin = deployment.admin;
        });

        it("should execute the deposit", async function () {
            const validBefore = Math.floor(Date.now() / 1000 + 3600);

            const value = ONE_USDC;
            fee = ONE_USDC.div(10);

            const nonce = await getEip3009Nonce(admin, usdc);

            const receiveSig = await getReceiveSignature({
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

            const predicate = new ethers.Contract(
                usdcPredicate,
                ["event LockedERC20(address indexed, address indexed, address indexed, uint256 amount)"],
                ethers.provider,
            );

            await expect(router.deposit(admin.address, admin.address, value, fee, validBefore, nonce, receiveSig))
                .to.emit(predicate, "LockedERC20")
                .withArgs(router.address, admin.address, usdc, value.sub(fee));

            reusedReceiveSig = receiveSig;

            reusedValue = value;
            reusedNonce = nonce;
            reusedValidBefore = validBefore;
        });

        it("DepositRouter contract has a balance of the fee", async () => {
            const balance = await usdcContract.balanceOf(router.address);
            expect(balance.toString()).to.equal(fee.toString());
        });

        it("initial transfer should revert if deposit doesn't succeed", async () => {
            const expectBalanceIsFee = async (): Promise<void> => {
                const routerBalance = await usdcContract.balanceOf(router.address);
                expect(routerBalance.toString()).to.equal(fee.toString());
            };

            await expectBalanceIsFee();

            const validBefore = Math.floor(Date.now() / 1000);

            const value = ONE_USDC;

            const nonce = await getEip3009Nonce(admin, usdc);

            const receiveSig = await getReceiveSignature({
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

            await expect(
                router.deposit(admin.address, ethers.constants.AddressZero, value, fee, validBefore, nonce, receiveSig),
            ).to.be.revertedWith("RootChainManager: INVALID_USER");

            await expectBalanceIsFee();
        });

        it("fails on reused signature", async () => {
            await expect(
                router.deposit(
                    admin.address,
                    admin.address,
                    reusedValue,
                    fee,
                    reusedValidBefore,
                    reusedNonce,
                    reusedReceiveSig,
                ),
            ).to.be.revertedWith("FiatTokenV2: authorization is used or canceled");
        });
    });
});
