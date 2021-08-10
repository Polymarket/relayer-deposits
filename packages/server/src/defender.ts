import { DefenderRelaySigner, DefenderRelayProvider } from "defender-relay-client/lib/ethers"

import { chainId } from "./env";

let isDefenderSetup: boolean;

export const getIsDefenderSetup = async (): Promise<boolean> => {
    if (isDefenderSetup != null) return isDefenderSetup;

    const rawCredentials = process.env.DEFENDER_CREDENTIALS;

    if (!rawCredentials) return false;

    try {
        getCredentials();
    } catch (e: any) { // eslint-disable-line
        return false;
    }

    const provider = getDefenderProvider();

    const network = await provider.getNetwork();

    isDefenderSetup = network.chainId === chainId;

    return isDefenderSetup;
}

/*
 * Throws if DEFENDER_CREDENTIALS is undefined in the .env
 */
const getCredentials = (): any => JSON.parse(process.env.DEFENDER_CREDENTIALS); // eslint-disable-line

const getDefenderProvider = (): DefenderRelayProvider => {
    const credentials = getCredentials();

    return new DefenderRelayProvider(credentials);
}

export const getDefenderSigner = async (): Promise<DefenderRelaySigner> => {
    if (!(await getIsDefenderSetup())) throw new Error(`Cannot get defender signer.`);

    const provider = getDefenderProvider();
    return new DefenderRelaySigner(getCredentials(), provider);
}
