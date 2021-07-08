import { Wallet } from "@ethersproject/wallet";
import { Contract } from "@ethersproject/contracts";
import { getRouterAddress } from "@polymarket/relayer-deposits";

import depositRouterAbi from "./depositRouterAbi.json";

export function getDepositContract (wallet: Wallet, chainId: number): Contract {
    const routerAddress = getRouterAddress(chainId);

    return new Contract(routerAddress, depositRouterAbi, wallet);
}
