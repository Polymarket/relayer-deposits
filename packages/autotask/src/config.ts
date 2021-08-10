import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "ethers";

export interface Config {
  token: string;
  depositRouter: string;
  balanceThreshold: BigNumber;
  relayer: string;
}

export const GOERLI_CONFIG: Config = {
  token: "0x6847E4fa1EE2Af7e2E62793CBdf4E39957c71C50",
  depositRouter: "0xf018963152c5c2cA112964311e91Ff664C041087",
  balanceThreshold: ethers.utils.parseEther("0.5"),
  relayer: "0xb6cde01b2411a1fa7e34b0d333ccb3aec7f7ac03",
};

export const MAINNET_CONFIG: Config = {
  token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  depositRouter: "0xf136c4101E06fD6cde533ba20473B2c1f80cAFd6",
  balanceThreshold: ethers.utils.parseEther("0.25"),
  relayer: "", // TODO: complete
};
