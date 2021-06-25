import { ethers, network } from "hardhat";
import { BigNumber, Contract, constants } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

// address probably has some ETH
const COMPOUND_ETH = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5";

const UNISWAP_V2_ROUTER_02 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

export const fundAccountETH = async (account: string, amount: BigNumber): Promise<void> => {
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [COMPOUND_ETH]}
    );

    const signer = await ethers.provider.getSigner(COMPOUND_ETH);

    await signer.sendTransaction({
        to: account,
        value: amount
    });

    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [COMPOUND_ETH]}
    );
}

export const fundAccountUSDC = async (account: SignerWithAddress, sellAmount: BigNumber, usdc: string): Promise<void> => {
    const uniRouter = new Contract(
        UNISWAP_V2_ROUTER_02,
        ["function swapExactETHForTokens(uint, address[] calldata, address, uint) external payable"],
        account
    );

    const path = [WETH_ADDRESS, usdc];

    console.log("before swap");
    await uniRouter.swapExactETHForTokens(1, path, account.address, constants.MaxUint256, { value: sellAmount });
    console.log("after swap");
}
