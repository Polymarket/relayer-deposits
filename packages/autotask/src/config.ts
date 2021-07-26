import { BigNumber } from "@ethersproject/bignumber";

export interface Config {
    token: string,
    depositRouter: string,
    claimThreshold: BigNumber,
    swapThreshold: BigNumber,
    relayers: string[]
}

export const GOERLI_CONFIG: Config = {
    token: "0x6847E4fa1EE2Af7e2E62793CBdf4E39957c71C50",
    depositRouter: "0xf018963152c5c2cA112964311e91Ff664C041087",
    claimThreshold: BigNumber.from(20),
    swapThreshold: BigNumber.from(50),
    relayers : ["0x0212ed763Bac4E60f424ef19fAa940a2F787add2"]
} 

export const MAINNET_CONFIG : Config = {
    token: "", // TODO: complete 
    depositRouter: "0xfeEDf332689A821E24583eC9545a5A0E43188C27",
    claimThreshold: BigNumber.from(50),
    swapThreshold: BigNumber.from(50),
    relayers : [""] // TODO: complete 
}