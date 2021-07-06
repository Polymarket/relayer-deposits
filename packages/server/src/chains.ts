interface Chain {
    id: number;
    rpcUrls: string[];
}

const chains: Chain[] = [
    {
        id: 5,
        rpcUrls: [`https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`],
    },
    {
        id: 1,
        rpcUrls: [`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`],
    },
    {
        id: 31337,
        rpcUrls: ["http://localhost:8545"],
    },
];

export default chains;

export function getChain(id: number): Chain {
    const chain = chains.find(chain => chain.id === id);

    if (chain) return chain;

    throw new Error(`Couldn't find chain ${id}`);
}

const MAINNET_ROUTER = "";
const GOERLI_ROUTER = "0xD08ec47D0c0391E70CD458E423E6f4bD6FDC02fa";

export function getRouterAddress(network: number): string {
    switch (network) {
        case 1:
            throw new Error("MAINNET ROUTER NOT DEPLOYED");
        case 5:
            return GOERLI_ROUTER;
        default:
            console.log(`WARNING: using goerli router address with network id ${network}`);
            return GOERLI_ROUTER;
    }
}
