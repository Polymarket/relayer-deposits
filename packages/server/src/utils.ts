import { BigNumber } from "@ethersproject/bignumber";
import { Wallet } from "@ethersproject/wallet";
import { Signer } from "@ethersproject/abstract-signer";
import { JsonRpcMultiProvider } from "@polymarket/multi-endpoint-provider";
import { getGasPriceAndFee } from "@polymarket/relayer-deposits";

import { getChain } from "./chains";
import { getIsDefenderSetup, getDefenderSigner } from "./defender";
import { chainId } from "./env";

export const RELAYER_FEE = { standardFee: 0.1, minFee: BigNumber.from(10).pow(6).mul(3) } // 10% premium on gas price or a minimum 3 USDC fee

export const getWalletWithoutProvider = (): Wallet => Wallet.fromMnemonic(process.env.MNEMONIC);

export const getProvider = (network: number): JsonRpcMultiProvider => {
    const chainData = getChain(network);

    return new JsonRpcMultiProvider(chainData.rpcUrls);
};

export const getWallet = (): Wallet => {
    const provider = getProvider(chainId);

    if (!process.env.MNEMONIC) {
        throw new Error("MNEMONIC env var not set");
    }

    const wallet = getWalletWithoutProvider();

    return wallet.connect(provider);
}

export const getSigner = async (): Promise<Signer> => {
    if (await getIsDefenderSetup()) {
        return getDefenderSigner();
    }

    return new Promise(resolve => resolve(getWallet()));
};

export const getFee = async (): Promise<{ gasPrice: BigNumber, fee: BigNumber, ethPrice: string }> => {
    // always use mainnet fees
    const mainnetChainData = getChain(1);

    const provider = new JsonRpcMultiProvider(mainnetChainData.rpcUrls);

    return getGasPriceAndFee(provider, RELAYER_FEE, { gasStationKey: process.env.GAS_STATION_API_KEY })
}
