import { RelayerParams } from "defender-relay-client/lib/relayer";
import { DefenderRelaySigner } from "defender-relay-client/lib/ethers";
import { getDepositRouterAddress, getRelayerProvider } from "./utils";
import { claim } from "./claim";
import { swapAndSend } from "./swap";

/**
 * Handler function to be called by OZ Autotask
 * Claims fees for a relayer and swaps them for ETH
 * NOTE: This should be called with the registered relayer address as Signer
 * @param credentials
 */
export const handler = async (credentials: RelayerParams) => {
  const provider = getRelayerProvider(credentials);
  const signer = new DefenderRelaySigner(credentials, provider, {
    speed: "fastest",
  });

  const chainId = await signer.getChainId();
  console.log(`Starting claim and swap autotask, chainID: ${chainId}...`);

  const routerAddress = getDepositRouterAddress(chainId);

  try {
    const claimedFees = await claim(signer, routerAddress);

    await swapAndSend(signer, routerAddress, claimedFees);

    console.log(`Complete!`);
  } catch (e) {
    console.error("Autotask failed!");
    console.error(e);
  }
};
