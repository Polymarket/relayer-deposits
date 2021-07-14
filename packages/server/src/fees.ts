import { BigNumber } from "@ethersproject/bignumber";
import { getGasPriceAndFee } from "@polymarket/relayer-deposits";
import { JsonRpcMultiProvider } from "@polymarket/multi-endpoint-provider";

import { getChain } from "./chains";

export const getFee = async (): Promise<{ gasPrice: BigNumber, fee: BigNumber }> => {
    // always use mainnet fees
    const mainnetChainData = getChain(1);

    const provider = new JsonRpcMultiProvider(mainnetChainData.rpcUrls);

    return getGasPriceAndFee(provider, process.env.GAS_STATION_API_KEY)
}
