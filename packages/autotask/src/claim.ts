import ERC20Abi from './abi/ERC20';
import { Config } from './config';
import { Signer } from "@ethersproject/abstract-signer";
import DepositContractAbi from "./abi/DepositContractAbi";
import { Contract } from 'ethers';
import { BigNumber } from "@ethersproject/bignumber";

export const claim = async(signer: Signer, config: Config) => {
    const routerAddress = config.depositRouter;
    const usdcTokenAddress = config.depositRouter;
    const address = await signer.getAddress();

    const routerContract = new Contract(routerAddress, DepositContractAbi, signer);
    const usdc = new Contract(usdcTokenAddress, ERC20Abi, signer);

    const usdcBalance: BigNumber = await usdc.balanceOf(routerAddress);
    console.log(`USDC Balance on deposit router: ${usdcBalance}`);

    if(usdcBalance.lt(config.claimThreshold)){
        console.log(`USDC Balance on router < claim threshold: ${config.claimThreshold}`);
        return;
    }

    if(usdcBalance.gte(config.claimThreshold)){
        console.log(`Claiming ${usdcBalance} USDC from router...`);
        const txn = routerContract.claimFees(address, usdcBalance);
        await txn.wait();
        console.log(`Claimed ${usdcBalance} from contract!`);
    }
}