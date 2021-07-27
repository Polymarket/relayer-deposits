import { BigNumber } from "@ethersproject/bignumber";

export const USDC_DECIMALS = BigNumber.from(10).pow(6);
export const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
export const USDC_CLAIMED_TOO_LOW = USDC_DECIMALS.mul(500);
