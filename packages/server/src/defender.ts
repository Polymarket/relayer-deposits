import { DefenderRelaySigner, DefenderRelayProvider } from "defender-relay-client/lib/ethers"

export const isDefenderSetup = (network: number): boolean => {
    const defenderChainId = process.env.DEFENDER_CHAIN_ID;
    const rawCredentials = process.env.DEFENDER_CREDENTIALS;

    if (!rawCredentials || !defenderChainId) return false;

    if (defenderChainId !== network.toString()) return false;

    try {
        console.log(JSON.parse(rawCredentials));
        return true;
    } catch (_e: any) {
        return false;
    }
}

isDefenderSetup(5);

export const getDefenderSigner = (network: number): DefenderRelaySigner => {
    if (!isDefenderSetup(network)) throw new Error(`Cannot get defender signer on network ${network}`);

    const credentials = JSON.parse(process.env.DEFENDER_CREDENTIALS);

    const provider = new DefenderRelayProvider(credentials);
    return new DefenderRelaySigner(credentials, provider);
}
