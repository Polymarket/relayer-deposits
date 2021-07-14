import { exchangeRate } from "@tomfrench/chainlink-asset-converter";
import { Provider } from "@ethersproject/abstract-provider";
import { BigNumber } from "@ethersproject/bignumber";
import { mulBN } from "@polymarket/amm-maths";
import axios from "axios";

import { DEPOSIT_GAS, ETHER_DECIMALS, USDC_DECIMALS } from "./constants";

/**
 * Given an amount of ETH in wei and an ethPrice in USDC return the cost in USDC
 * usdc_amount = (fee wei / 10^ether_decimals) * ethPrice usdc/eth * 10^usdc_decimals
 *
 * @param wei The amount of Ether in wei
 * @param ethPrice The price of Ether in USDC
 */
export const ethToUSDC = (wei: BigNumber, ethPrice: string): BigNumber =>
    mulBN(wei, parseFloat(ethPrice)).div(
        BigNumber.from(10).pow(ETHER_DECIMALS - USDC_DECIMALS),
    );

export const getGasPriceFromProvider = async (provider: Provider): Promise<BigNumber> => {
    const gasPrice = await provider.getGasPrice();

    // pad gas price by 20% to mimic a fast gas price
    return gasPrice.mul(120).div(100);
}

/**
 * Return the current gas price as a Big Number in wei
 */
export const getGasPrice = async (provider: Provider, gasStationKey?: string): Promise<BigNumber> => {
    if (!gasStationKey) return getGasPriceFromProvider(provider);

    try {
        const {
            data: { fast },
        } = await axios({
            method: "get",
            url: `https://ethgasstation.info/api/ethgasAPI.json?api-key=${gasStationKey}`,
        });

        /**
         * https://docs.ethgasstation.info/gas-price returns prices that you must
         * divide by 10 to get their value in gwei. Therefore to get their value in
         * wei we must multiply by 10e8.
         */
        return BigNumber.from(fast).mul(BigNumber.from(10).pow(8));
    } catch (e) {
        return getGasPriceFromProvider(provider);
    }
};

/**
 * @return the current price of ETH in USDC.
 */
export const getEtherPrice = async (provider: Provider): Promise<string> => {
    const ethPrice = await exchangeRate(
        "ETH",
        "USDC",
        provider,
    );

    if (ethPrice === null) {
        throw Error("Could not find ETH price");
    }

    return ethPrice as string;
};

export const getGasPriceAndFee = async (
    provider: Provider,
    gasStationKey?: string
): Promise<{ gasPrice: BigNumber, fee: BigNumber }> => {
    const [ethPrice, gasPrice] = await Promise.all([
        getEtherPrice(provider),
        getGasPrice(provider, gasStationKey),
    ]);

    const gasPriceUSDC = ethToUSDC(gasPrice, ethPrice);

    return {
        gasPrice,
        fee: gasPriceUSDC.mul(DEPOSIT_GAS),
    }
}
