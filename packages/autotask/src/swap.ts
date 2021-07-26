import { BigNumber } from "@ethersproject/bignumber";
import UniswapV2RouterAbi from "./abi/UniswapV2RouterAbi";
import { Zero } from "@ethersproject/constants";

/**
 * 
 * @param tokenInAddress 
 * @param tokenInAmount 
 * @returns 
 */
export const swapExactTokenForETH = async (tokenInAddress: string, tokenInAmount: BigNumber): Promise<BigNumber> => {
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
