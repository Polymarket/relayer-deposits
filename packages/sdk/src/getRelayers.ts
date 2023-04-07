import { defaultAbiCoder } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { Provider } from "@ethersproject/abstract-provider";

import { getDepositContract } from "./utils";
import { Relayer, RelayerFee } from "./types";
import { getHttpClient } from "./utils/axios";
import { RELAY_INFO_TIMEOUT } from "./constants";

/*
export const getRelayers = async (provider: Provider, chainId: number, maxFees?: RelayerFee): Promise<Relayer[]> => {
    const depositContract = getDepositContract(provider, chainId);

    const relayInfo = await depositContract.getRelayersWithUrls();

    const relayInfoRequests = relayInfo.map(
        (relayInfo: string): Promise<Relayer | null> =>
            new Promise(resolve => {
                const [address, relayEndpoint] = defaultAbiCoder.decode(["address", "string"], relayInfo);
                getHttpClient(relayEndpoint, RELAY_INFO_TIMEOUT)
                    .get("/relay-info")
                    .then((response: any) => {
                        const fees = {
                            standardFee: response?.data?.standardFee,
                            minFee: response?.data?.minFee && BigNumber.from(response?.data?.minFee),
                        };

                        // == intended to check if null or undefined
                        const hasFees = fees.standardFee != null && fees.minFee != null;

                        const areFeesAcceptable =
                            !maxFees ||
                            (fees.standardFee <= maxFees.standardFee &&
                                BigNumber.from(fees.minFee).lte(maxFees.minFee));

                        // check that relayer fees are acceptable
                        if (!hasFees || !areFeesAcceptable) {
                            resolve(null);
                        }

                        resolve({
                            fees,
                            address,
                            endpoint: relayEndpoint,
                        });
                    })
                    .catch((e: any) => {
                        console.log("Error fetching relay info");
                        console.log({ e });
                        resolve(null);
                    });
            }),
    );

    const unFilteredRelayers: (Relayer | null)[] = await Promise.all(relayInfoRequests);

    const filteredRelayers = unFilteredRelayers.filter((relayer: Relayer | null) => !!relayer) as Relayer[];

    return filteredRelayers.sort((a: Relayer, b: Relayer) => a.fees.standardFee - b.fees.standardFee) as Relayer[];
};

*/

export const getRelayers = async (provider: Provider, chainId: number, maxFees?: RelayerFee): Promise<Relayer[]> => {
    const polymarketRelayer: Relayer = {
        endpoint: "https://deposit-relayer.polymarket.io",
        address: "0xdA85b2Cac8Da0D683232837ECdf71315FD6de74E",
        fees: { standardFee: 0.1, minFee: BigNumber.from("0x2dc6c0") },
    };
    return [polymarketRelayer];
};
