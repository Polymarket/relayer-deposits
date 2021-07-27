import { RelayerParams } from "defender-relay-client/lib/relayer";
import { DefenderRelayProvider } from "defender-relay-client/lib/ethers";
import { Provider } from "@ethersproject/abstract-provider";
import { Config, MAINNET_CONFIG, GOERLI_CONFIG } from "./config";

export const getRelayerProvider = (credentials: RelayerParams): Provider => {
  const provider = new DefenderRelayProvider(credentials);
  return provider;
};

export const getConfig = (chainId: number): Config => {
  switch (chainId) {
    case 1:
      return MAINNET_CONFIG;
    case 5:
      return GOERLI_CONFIG;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
};
