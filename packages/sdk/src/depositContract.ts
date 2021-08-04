import { Contract } from "@ethersproject/contracts";
import { Signer } from "@ethersproject/abstract-signer";
import { Provider } from "@ethersproject/abstract-provider";
import { defaultAbiCoder } from "@ethersproject/abi";

import { getRouterAddress } from "./networks";
import { Relayer } from "./types";
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

export const getRelayers = async (provider: Provider, chainId: number): Promise<Relayer[]> => {
    const depositContract = getDepositContract(provider, chainId);

    const relayInfo = await depositContract.getRelayersWithUrls();

    const relayInfoRequests = relayInfo.map(
        (relayInfo: string) =>
            new Promise(resolve => {
                const [, relayEndpoint] = defaultAbiCoder.decode(["address", "string"], relayInfo);
                getHttpClient(relayEndpoint)
                    .get("/relay-info")
                    .then((response: any) => {
                        resolve({
                            fee: response.data.Fee,
                            address: response.data.RelayerAddress,
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
