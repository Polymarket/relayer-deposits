import { defaultAbiCoder } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { Provider } from "@ethersproject/abstract-provider";

import { getDepositContract } from "./utils";
import { Relayer, RelayerFee } from "./types";
import { getHttpClient } from "./utils/axios";
import { RELAY_INFO_TIMEOUT } from "./constants";

export const getRelayers = async (provider: Provider, chainId: number, maxFees?: RelayerFee): Promise<Relayer[]> => {
    const depositContract = getDepositContract(provider, chainId);

    const relayInfo = await depositContract.getRelayersWithUrls();

    const relayInfoRequests = relayInfo.map(
        (relayInfo: string) =>
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
                            resolve({});
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
                        resolve({});
                    });
            }),
    );

    const unFilteredRelayers = await Promise.all(relayInfoRequests);

    return unFilteredRelayers
        .filter((relayer: any) => !!relayer.address)
        .sort((a: any, b: any) => a.fee - b.fee) as Relayer[];
};
