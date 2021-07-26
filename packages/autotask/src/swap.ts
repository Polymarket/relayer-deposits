import ERC20Abi from './abi/ERC20';
import { BigNumber } from "@ethersproject/bignumber";
import UniswapV2RouterAbi from "./abi/UniswapV2RouterAbi";
import { Zero } from "@ethersproject/constants";
import { Contract, Signer } from "ethers";
import { Config } from "./config";

/**
 * 
 * @param tokenInAddress 
 * @param tokenInAmount 
 * @returns 
 */
export const swap = async (signer: Signer, config: Config): Promise<BigNumber> => {
    
    const address = await signer.getAddress();
    const usdcTokenAddress = config.depositRouter;
    const swapThreshold : BigNumber = config.swapThreshold;

    const usdc = new Contract(usdcTokenAddress, ERC20Abi, signer);
    const usdcBalanceOnSigner:BigNumber = await usdc.balanceOf(address);
    
    if(usdcBalanceOnSigner.lt(swapThreshold)){
        console.log(`USDC Balance on signer ${usdcBalanceOnSigner} < swap threshold of ${swapThreshold}`)
        return;
    }

    if(usdcBalanceOnSigner.gte(swapThreshold)){
        console.log(`Swapping ${usdcBalanceOnSigner} USDC for ETH...`);

        const path = [];
    }
    
    return BigNumber.from(0);

    //initiialize router here with relayer signer:
    //const router = new Contract(address, abi, signer);
    //getRouter -> implement this in utils, simple switch case for now
    //const path = [USDC, WETH]// just hardcode this
    //const amts = await router.getAmountsOut(tokenInAmount, path)
    
    //const wethExpectedAmt = amts[1];
    // uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
    
    //const txn = router.swapExactTokensForETH(tokenInAmount, ethExpectedAmt, path, signer.address, deadline)
    // await txn.wait(); //throw a try-catch here if it fails, just log and do nothing
    //getBeneficiaryRelayerAddress(); <- Simple algo to pick is to just check the eth balance on the relayer
    
    return Zero;
}
