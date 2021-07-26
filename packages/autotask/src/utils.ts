import { Relayer } from 'defender-relay-client';
import { RelayerParams } from 'defender-relay-client/lib/relayer';
import { DefenderRelaySigner, DefenderRelayProvider } from "defender-relay-client/lib/ethers";
import { Signer } from "@ethersproject/abstract-signer";

export const getRelayerSigner = (credentials: RelayerParams) : Signer => {
    const provider = new DefenderRelayProvider(credentials);;
    const signer = new DefenderRelaySigner(credentials, provider, { speed: 'fastest' });
    return signer;
} 