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

async function maybeRegister (chainId: number): Promise<void> {
    const signer = getSigner(chainId);
    const depositContract = getDepositContract(signer, chainId);

    try {
        const isRegistered = await depositContract.isRegistered(await signer.getAddress());

    if (!isRegistered) {
        const stakeAmount = await depositContract.stakeAmount();

        const tx = await depositContract.register("", { value: stakeAmount });
        console.log(`Registering on chainId ${chainId} with tx hash ${tx.hash}`);
    }
    } catch (e) {
        console.log(`Error registering on chainId ${chainId}: ${e.message || e.error || e}`)
    }
}

export async function maybeRegisterAllChains (): Promise<void> {
    const registerPromises = chains.map(({ id }) => { 
        maybeRegister(id)
    });

    await Promise.all(registerPromises);
}
