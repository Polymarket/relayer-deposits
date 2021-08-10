import { RelayerParams } from "defender-relay-client/lib/relayer";
import { DefenderRelayProvider } from "defender-relay-client/lib/ethers";
import { Provider } from "@ethersproject/abstract-provider";

export const getRelayerProvider = (credentials: RelayerParams): Provider => {
  const provider = new DefenderRelayProvider(credentials);
  return provider;
};

export const getDepositRouterAddress = (chainID: number): string => {
  switch (chainID) {
    case 1:
      return "0xf136c4101E06fD6cde533ba20473B2c1f80cAFd6";
    case 5:
      return "0xf4b00848faD26b842acaf4F6f99E5735b2541007";
    default:
      throw new Error(`Unsupported chainId: ${chainID}`);
  }
};
