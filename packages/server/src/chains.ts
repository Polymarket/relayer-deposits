interface Chain {
    id: number;
    rpcUrls: string[];
}

const chains: Chain[] = [
//    {
//        id: 5,
//        rpcUrls: [`https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`],
//    },
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
