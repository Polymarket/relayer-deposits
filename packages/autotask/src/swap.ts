import { BigNumber } from "@ethersproject/bignumber";
import { Signer } from "@ethersproject/abstract-signer";
import { MaxUint256 } from "@ethersproject/constants";
import { Contract } from "ethers";
import UniswapV2RouterAbi from "./abi/UniswapV2RouterAbi";
import ERC20Abi from "./abi/ERC20";
import { Config } from "./config";
import { UNISWAP_ROUTER } from "./constants";

const approve = async (signer: Signer, token: Contract, router: Contract) => {
  const address = await signer.getAddress();
  const tokenBalanceOnSigner = await token.balanceOf(address);
  const allowance = await token.allowance(address, router.address);

  if (allowance.lt(tokenBalanceOnSigner)) {
    console.log(`Approving the UniswapV2Router...`);
    const txn = await token.approve(router.address, MaxUint256);
    await txn.wait();
    console.log(`Approval complete!`);
  }
};

const constructPath = async (
  token: Contract,
  router: Contract
): Promise<string[]> => {
  const path: string[] = [];
  const wethAddress = await router.WETH();
  path.push(token.address);
  path.push(wethAddress);
  return path;
};

const swapExactTokensForETH = async (
  token: Contract,
  tokenInAmount: BigNumber,
  router: Contract,
  to: string
) => {
  console.log(`Starting swap...`);
  const path = await constructPath(token, router);

  // Using Uniswap itself as the oracle to get expected ETH out
  const amts = await router.getAmountsOut(tokenInAmount, path);
  const minimumETHOut: BigNumber = amts[1];

  // slippage: 1% max
  const minETHOutWithSlippage = minimumETHOut
    .mul(BigNumber.from(99))
    .div(BigNumber.from(100));

  // deadline: 10 mins ahead
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10;

  console.log(`tokenInAmount: ${tokenInAmount}`);
  console.log(`Min Expected ETH out: ${minETHOutWithSlippage}`);
  console.log(`Deadline: ${deadline}`);

  const txn = await router.swapExactTokensForETH(
    tokenInAmount,
    minETHOutWithSlippage,
    path,
    to,
    deadline
  );
  await txn.wait();
  console.log(`Swap Complete!`);
};

/**
 *
 * @param signer - Signer in use
 * @param config - Run Config
 * @param receiver - Address of relayer to be filled
 * @returns
 */
export const swapAndSend = async (
  signer: Signer,
  config: Config,
  receiver: string
) => {
  const address = await signer.getAddress();
  const usdcTokenAddress = config.token;
  const { swapThreshold } = config;

  const usdc = new Contract(usdcTokenAddress, ERC20Abi, signer);
  const usdcBalanceOnSigner: BigNumber = await usdc.balanceOf(address);

  const uniswapV2Router = new Contract(
    UNISWAP_ROUTER,
    UniswapV2RouterAbi,
    signer
  );

  if (usdcBalanceOnSigner.lt(swapThreshold)) {
    console.log(`USDC Balance on signer below swap threshold! Returning..`);
    return;
  }

  if (usdcBalanceOnSigner.gte(swapThreshold)) {
    console.log(`Swapping ${usdcBalanceOnSigner} USDC for ETH...`);
    await approve(signer, usdc, uniswapV2Router);
    await swapExactTokensForETH(
      usdc,
      usdcBalanceOnSigner,
      uniswapV2Router,
      receiver
    );
  }
};
