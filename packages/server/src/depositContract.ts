import { Signer } from "@ethersproject/abstract-signer";
import { Contract } from "@ethersproject/contracts";
import { getRouterAddress } from "@polymarket/relayer-deposits";

import depositRouterAbi from "./depositRouterAbi.json";

export function getDepositContract (signer: Signer, chainId: number): Contract {
    const routerAddress = getRouterAddress(chainId);

    return new Contract(routerAddress, depositRouterAbi, signer);
}
