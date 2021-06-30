import { Wallet } from "@ethersproject/wallet";
import { JsonRpcMultiProvider } from "@polymarket/multi-endpoint-provider";
import { getChain } from "./chains";

const getWallet = (network: number): Wallet => {
    const chainData = getChain(network);

    const provider = new JsonRpcMultiProvider(chainData.rpcUrls);

    if (!process.env.MNEMONIC) {
        throw new Error("MNEMONIC env var not set");
    }

    const wallet = Wallet.fromMnemonic(process.env.MNEMONIC);

    return wallet.connect(provider);
};

export default getWallet;
