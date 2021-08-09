import { Signer } from "@ethersproject/abstract-signer";
import { Contract } from "@ethersproject/contracts";
import { getRouterAddress } from "@polymarket/relayer-deposits";

import depositRouterAbi from "./depositRouterAbi.json";
import chains from "./chains";
import { getSigner } from "./utils";

export function getDepositContract (signer: Signer, chainId: number): Contract {
    const routerAddress = getRouterAddress(chainId);

    return new Contract(routerAddress, depositRouterAbi, signer);
}

async function maybeUpdateUrl (chainId: number): Promise<void> {
    const signer = getSigner(chainId)
    const depositContract = getDepositContract(signer, chainId);

    const registeredUrl = await depositContract.relayerUrl(await signer.getAddress());

    const relayerUrl = process.env.RELAYER_URL

    if (relayerUrl && relayerUrl !== registeredUrl) {
        try {
            const tx = await depositContract.setRelayerUrl(relayerUrl);
            console.log(`Updating relayer url to ${relayerUrl} at tx hash ${tx.hash}`);
        } catch (e) {
            console.log(`Error updating relayer url on ${chainId}: ${e.message || e.error || e}`);
        }
    }
}

async function maybeRegister (chainId: number): Promise<void> {
    const signer = getSigner(chainId);
    const depositContract = getDepositContract(signer, chainId);

    const isRegistered = await depositContract.isRegistered(await signer.getAddress());

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

export async function maybeRegisterAllChains (): Promise<void> {
    const registerPromises = chains.map(({ id }) => {
        if (process.env.TESTING_MODE === "true" && id !== 31337) return;

        return maybeRegister(id)
    });

    await Promise.all(registerPromises);
}
