type DepositContracts = {
    usdc: string;
    rootChainManager: string;
    usdcPredicate: string;
};

export const MAINNET_CONTRACTS: DepositContracts = {
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    rootChainManager: "0xA0c68C638235ee32657e8f720a23ceC1bFc77C77",
    usdcPredicate: "0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf",
};

export const GOERLI_CONTRACTS: DepositContracts = {
    usdc: "0x6847E4fa1EE2Af7e2E62793CBdf4E39957c71C50",
    rootChainManager: "0xBbD7cBFA79faee899Eaf900F13C9065bF03B1A74",
    usdcPredicate: "0xdD6596F2029e6233DEFfaCa316e6A95217d4Dc34",
};

export const getContracts = (network: number): DepositContracts => {
    switch (network) {
        case 1:
            return MAINNET_CONTRACTS;
        case 5:
            return GOERLI_CONTRACTS;
        default:
            console.log(  // eslint-disable-line
                `WARNING: running on network id ${network} with mainnet contract addresses. Ignore this warning if you are testing.`,
            );
            return MAINNET_CONTRACTS;
    }
};

export const getSigChainId = (network: number): number => {
    if (network === 31337) return 1;

    return network;
};

const MAINNET_ROUTER = "0xf136c4101E06fD6cde533ba20473B2c1f80cAFd6";
const GOERLI_ROUTER = "0xf4b00848faD26b842acaf4F6f99E5735b2541007";

export function getRouterAddress(network: number): string {
    switch (network) {
        case 1:
            return MAINNET_ROUTER;
        case 5:
            return GOERLI_ROUTER;
        default:
            console.log( // eslint-disable-line
                `WARNING: using mainnet router address with network id ${network}. Ignore this warning if you are testing.`,
            );
            return MAINNET_ROUTER;
    }
}
