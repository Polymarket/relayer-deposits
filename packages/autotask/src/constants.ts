import { BigNumber } from "ethers";

export const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const USDC_DECIMALS = BigNumber.from(10).pow(6);

export const CLAIMABLE_FEES_THRESHOLD = BigNumber.from(1000).mul(USDC_DECIMALS);
