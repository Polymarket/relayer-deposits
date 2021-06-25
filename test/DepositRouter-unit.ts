/* eslint-disable func-names */
import { expect } from "chai";
import { MockContract } from "ethereum-waffle";
import { deployments, ethers, network } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

import { DepositRouter, TestERC20Permit } from "../typechain";
import { deploy, deployMock, getPermitSignature } from "./helpers";

const setup = deployments.createFixture(async () => {

    const admin = await ethers.getNamedSigner("admin");

    const tokenName = "testToken";

    const permitToken = await deploy<TestERC20Permit>("TestERC20Permit", {
        args: [tokenName, "TST"],
        connect: admin,
    })

    await permitToken.mint(admin.address, ethers.constants.WeiPerEther.mul(1000));

    const rootChainManagerMock = await deployMock("IRootChainManager");

    await rootChainManagerMock.mock.depositFor.returns();

    const predicateContract = ethers.Wallet.createRandom().address

    const router = await deploy<DepositRouter>("DepositRouter", {
        args: [permitToken.address, rootChainManagerMock.address, predicateContract],
        connect: admin,
    });

    return {
        router,
        permitToken,
        admin,
        tokenName,
        predicateContract,
    };
});

describe("Unit tests", function () {
    describe("DepositRouter", function () {
        let router: DepositRouter;
        let permitToken: TestERC20Permit;
        let admin: SignerWithAddress;
        let tokenName: string;
        let predicateContract: string;

        beforeEach(async function () {
            const deployment = await setup();
            router = deployment.router;
            permitToken = deployment.permitToken;
            admin = deployment.admin;
            tokenName = deployment.tokenName;
            predicateContract = deployment.predicateContract;
        });

        it("should permit predicate", async function () {
            const deadline = Math.floor(Date.now() / 1000 + 3600);

            const permitValue = ethers.constants.WeiPerEther;

            const { v, r, s } = await getPermitSignature({
                signer: admin,
                tokenName,
                contractVersion: "1",
                chainId: 31337,
                verifyingContract: permitToken.address,
                spender: predicateContract,
                value: permitValue,
                nonce: await permitToken.nonces(admin.address),
                deadline: deadline,
            })

            await expect(router.permitAndDeposit(
                admin.address,
                permitValue,
                deadline,
                v,
                r,
                s
            )).to.emit(permitToken, "Approval").withArgs(admin.address, predicateContract, permitValue);
        });
    });
});
