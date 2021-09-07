import { BigNumber } from "@ethersproject/bignumber";
import { Signer } from "@ethersproject/abstract-signer";
import { MaxUint256 } from "@ethersproject/constants";
import { Contract } from "ethers";
import UniswapV2RouterAbi from "./abi/UniswapV2RouterAbi";
import ERC20Abi from "./abi/ERC20";
import { UNISWAP_ROUTER, CLAIMABLE_FEES_THRESHOLD } from "./constants";
import DepositRouterAbi from "./abi/DepositRouterAbi";

const approve = async (address: string, token: Contract, router: Contract) => {
  const tokenBalanceOnSigner = await token.balanceOf(address);
  const allowance = await token.allowance(address, router.address);

  if (allowance.lt(tokenBalanceOnSigner)) {
    console.log(`Approving the UniswapV2Router...`);
    const txn = await token.approve(router.address, MaxUint256);
    await txn.wait();
    console.log(`Approval complete!`);
  }
};

const getUsdcBalance = async (
  address: string,
  token: Contract
): Promise<BigNumber> => {
  return token.balanceOf(address);
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
 * @param signer - Signer in use
 * @param routerAddress - Address of the DepositRouter contract
 * @param collectedFees - Fees to be swapped for ETH
 */
export const swapAndSend = async (
  signer: Signer,
  routerAddress: string
): Promise<void> => {
  const address = await signer.getAddress();
  const routerContract = new Contract(routerAddress, DepositRouterAbi, signer);

  const rootTokenAddress = await routerContract.rootToken();

  const rootToken = new Contract(rootTokenAddress, ERC20Abi, signer);

  const uniswapV2Router = new Contract(
    UNISWAP_ROUTER,
    UniswapV2RouterAbi,
    signer
  );

  const balance = await getUsdcBalance(address, rootToken);

  if (balance.lt(CLAIMABLE_FEES_THRESHOLD)) {
    console.log(
      `USDC balance ${balance} is below ${CLAIMABLE_FEES_THRESHOLD} USDC threshold.`
    );

    return;
  }

  console.log(`Swapping ${balance} USDC for ETH...`);
  await approve(address, rootToken, uniswapV2Router);
  await swapExactTokensForETH(rootToken, balance, uniswapV2Router, address);
};
