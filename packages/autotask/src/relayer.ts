import { Signer } from "@ethersproject/abstract-signer";
import { Config } from "./config";

const getRandomRelayer = (relayers: string[]): string => {
  const randIndex = Math.floor(Math.random() * relayers.length);
  return relayers[randIndex];
};

// TODO: implement different relayer fetch functions depending on the config
// e.g prod -> random, goerli -> lowest balance

export const getRecipientRelayer = async (
  signer: Signer,
  config: Config
): Promise<string> => {
  return getRandomRelayer(config.relayers.map((i) => i));
};
