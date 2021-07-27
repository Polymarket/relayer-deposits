import { Signer } from "@ethersproject/abstract-signer";
import { Contract } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";
import ERC20Abi from "./abi/ERC20";
import { Config } from "./config";
import DepositContractAbi from "./abi/DepositContractAbi";
import { USDC_DECIMALS, USDC_CLAIMED_TOO_LOW } from "./constants";

export const claim = async (signer: Signer, config: Config) => {
  const routerAddress = config.depositRouter;
  const usdcTokenAddress = config.token;
  const address = await signer.getAddress();

  const routerContract = new Contract(
    routerAddress,
    DepositContractAbi,
    signer
  );
  const usdc = new Contract(usdcTokenAddress, ERC20Abi, signer);

  const usdcBalance: BigNumber = await usdc.balanceOf(routerAddress);
  const usdcBalanceScaled: BigNumber = usdcBalance.div(USDC_DECIMALS);

  if (usdcBalance.lt(USDC_CLAIMED_TOO_LOW)) {
    console.warn(`USDC claimed is low: ${usdcBalanceScaled} USDC!`);
  }

  console.log(`Claiming ${usdcBalanceScaled} USDC from router...`);
  const txn = await routerContract.claimFees(address, usdcBalance);
  await txn.wait();
  console.log(`Claimed USDC from router!`);
};
