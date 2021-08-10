import { Signer } from "@ethersproject/abstract-signer";
import { Contract } from "@ethersproject/contracts";
import { getRouterAddress } from "@polymarket/relayer-deposits";

import depositRouterAbi from "./depositRouterAbi.json";
import { getSigner } from "./utils";

export function getDepositContract (signer: Signer, chainId: number): Contract {
    const routerAddress = getRouterAddress(chainId);

    return new Contract(routerAddress, depositRouterAbi, signer);
}

async function maybeUpdateUrl (chainId: number): Promise<void> {
    let depositContract: Contract;
    let registeredUrl: string;
    try {
        const signer = await getSigner()
        depositContract = getDepositContract(signer, chainId);

        registeredUrl = await depositContract.relayerUrl(await signer.getAddress());
    } catch(e) {} // eslint-disable-line

    const relayerUrl = process.env.RELAYER_URL

    if (relayerUrl && registeredUrl && relayerUrl !== registeredUrl) {
        try {
            const tx = await depositContract.setRelayerUrl(relayerUrl);
            console.log(`Updating relayer url to ${relayerUrl} at tx hash ${tx.hash}`);
        } catch (e) {
            console.log(`Error updating relayer url on ${chainId}: ${e.message || e.error || e}`);
        }
    }
}

export async function maybeRegister (chainId: number): Promise<void> {
    let depositContract: Contract;
    let isRegistered: boolean;

    try {
        const signer = await getSigner();
        depositContract = getDepositContract(signer, chainId);
        isRegistered = await depositContract.isRegistered(await signer.getAddress());
    } catch (e) {
        // don't try to register if no network is detected
        isRegistered = true
    }

    if (!isRegistered) {
        if (!process.env.RELAYER_URL) throw new Error("Cannot register relayer when RELAYER_URL is undefined in .env");

        const stakeAmount = await depositContract.stakeAmount();

        try {
            const tx = await depositContract.register(process.env.RELAYER_URL, { value: stakeAmount });
            console.log(`Registering on chainId ${chainId} with tx hash ${tx.hash}`);
        } catch (e) {
            console.log(`Error registering on chainId ${chainId}: ${e.message || e.error || e}`);
        }
    } else {
        await maybeUpdateUrl(chainId);
    }
}
