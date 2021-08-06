import { Contract } from "@ethersproject/contracts";
import { Signer } from "@ethersproject/abstract-signer";
import { Provider } from "@ethersproject/abstract-provider";
import { defaultAbiCoder } from "@ethersproject/abi";

import { BigNumber } from "@ethersproject/bignumber";
import { getRouterAddress } from "./networks";
import { Relayer, RelayerFee } from "./types";
import { getHttpClient } from "./axios";

export const getDepositContract = (signerOrProvider: Signer | Provider, chainId: number): Contract => {
    return new Contract(
        getRouterAddress(chainId),
        [
            "function nonces(address) external view returns (uint256)",
            "function getRelayersWithUrls() external view returns (bytes[] memory)",
        ],
        signerOrProvider,
    );
};

export const getRelayers = async (provider: Provider, chainId: number, maxFees?: RelayerFee): Promise<Relayer[]> => {
    const depositContract = getDepositContract(provider, chainId);

    const relayInfo = await depositContract.getRelayersWithUrls();

    const relayInfoRequests = relayInfo.map(
        (relayInfo: string) =>
            new Promise(resolve => {
                const [address, relayEndpoint] = defaultAbiCoder.decode(["address", "string"], relayInfo);
                getHttpClient(relayEndpoint)
                    .get("/relay-info")
                    .then((response: any) => {
                        const relayerAddress = response?.data?.relayerAddress;

                        // a relayer submitting a transaction with the wrong address will revert
                        if (relayerAddress.toLowerCase() !== address.toLowerCase) {
                            resolve({});
                        }

                        const fees = {
                            standardFee: response?.data?.standardFee,
                            minFee: response?.data?.minFee,
                        };

                        // == intended to check if null or undefined
                        const hasFees = fees.standardFee == null || fees.minFee == null;

                        const areFeesAcceptable =
                            maxFees &&
                            (fees.standardFee > maxFees.standardFee || BigNumber.from(fees.minFee).gt(maxFees.minFee));

                        // check that relayer fees are acceptable
                        if (!hasFees || !areFeesAcceptable) {
                            resolve({});
                        }

                        resolve({
                            fees,
                            address: relayerAddress,
                            endpoint: relayEndpoint,
                        });
                    })
                    .catch(() => {
                        resolve({});
                    });
            }),
    );

    const unFilteredRelayers = await Promise.all(relayInfoRequests);

    return unFilteredRelayers
        .filter((relayer: any) => !!relayer.address)
        .sort((a: any, b: any) => a.fee - b.fee) as Relayer[];
};
