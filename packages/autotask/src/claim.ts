import { Signer } from "@ethersproject/abstract-signer";
import { BigNumber, Contract } from "ethers";
import DepositRouterAbi from "./abi/DepositRouterAbi";
import { CLAIMABLE_FEES_THRESHOLD } from "./constants";

/**
 * Claims pro rata fees for a relayer
 * @param signer
 * @param routerAddress
 * @returns
 */
export const claim = async (
  signer: Signer,
  routerAddress: string
): Promise<BigNumber> => {
  const address = await signer.getAddress();

  const routerContract = new Contract(routerAddress, DepositRouterAbi, signer);

  const claimableFees: BigNumber = await routerContract.collectedFees(address);

  if (claimableFees.lt(CLAIMABLE_FEES_THRESHOLD)) {
    console.log(`Fee balance: ${claimableFees} below claimable threshold!`);
    return null;
  }

  console.log(`Claiming ${claimableFees} USDC from router...`);
  const txn = await routerContract.claimFees(address, claimableFees);
  await txn.wait();
  console.log(`Claimed USDC from router!`);

  return claimableFees;
};
