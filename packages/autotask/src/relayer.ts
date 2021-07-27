import { Signer } from "@ethersproject/abstract-signer";
import { BigNumber } from "@ethersproject/bignumber";

export const getRelayerBalance = async (
  relayer: string,
  signer: Signer
): Promise<BigNumber> => {
  const balance = await signer.provider.getBalance(relayer);
  return balance;
};
