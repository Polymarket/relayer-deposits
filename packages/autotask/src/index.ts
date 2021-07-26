import { RelayerParams } from "defender-relay-client/lib/relayer";
import { DefenderRelaySigner } from "defender-relay-client/lib/ethers";
import { getConfig, getRelayerProvider } from "./utils";
import { claim } from "./claim";
import { swapAndSend } from "./swap";
import { getRecipientRelayer } from "./relayer";

export const handler = async (credentials: RelayerParams) => {
  const provider = getRelayerProvider(credentials);
  const signer = new DefenderRelaySigner(credentials, provider, {
    speed: "fastest",
  });

  const chainId = await signer.getChainId();
  console.log(`In autotask handler function, chainid: ${chainId}...`);

  const config = getConfig(chainId);

  try {
    // Claim USDC from deposit contract
    await claim(signer, config);

    // Get relayer address to receive ETH
    const recieverRelayer = await getRecipientRelayer(signer, config);

    // Swap USDC to ETH and forward to relayer
    await swapAndSend(signer, config, recieverRelayer);

    console.log(`Complete!`);
  } catch (e) {
    console.error("Autotask failed!");
    console.error(e);
  }
};
