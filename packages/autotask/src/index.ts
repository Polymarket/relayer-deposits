import { RelayerParams } from "defender-relay-client/lib/relayer";
import { DefenderRelaySigner } from "defender-relay-client/lib/ethers";
import { getConfig, getRelayerProvider } from "./utils";
import { claim } from "./claim";
import { swapAndSend } from "./swap";
import { getRelayerBalance } from "./relayer";

export const handler = async (credentials: RelayerParams) => {
  const provider = getRelayerProvider(credentials);
  const signer = new DefenderRelaySigner(credentials, provider, {
    speed: "fastest",
  });

  const chainId = await signer.getChainId();
  console.log(`Starting autotask function, chainid: ${chainId}...`);

  const config = getConfig(chainId);

  try {
    // Check ETH balance on Relayer
    const { relayer } = config;
    const relayerBalance = await getRelayerBalance(relayer, signer);

    // Claim and forward fees to Relayer
    // if relayer balance below balanceThreshold
    if (relayerBalance.lte(config.balanceThreshold)) {
      console.log(`Relayer balance < balanceThreshold, refilling relayer..`);
      await claim(signer, config);

      await swapAndSend(signer, config, relayer);

      console.log(`Complete!`);
    }
  } catch (e) {
    console.error("Autotask failed!");
    console.error(e);
  }
};
