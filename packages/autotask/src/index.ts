import { RelayerParams } from 'defender-relay-client/lib/relayer';
import { getConfig, getRelayerProvider } from './utils';
import { DefenderRelaySigner } from 'defender-relay-client/lib/ethers';
import { claim } from './claim';
import { swap } from './swap';

//TODO: flow:
//2. Admin swaps for ETH
//3. Admin sends to relayers(which one? random? round robin? unclear.)


export const handler = async(credentials: RelayerParams) => {
    const provider = getRelayerProvider(credentials);
    const signer = new DefenderRelaySigner(credentials, provider, { speed: 'fastest' });
    
    const chainId = await signer.getChainId();
    console.log(`In autotask handler function, chainid: ${chainId}...`);
    
    const config = getConfig(chainId);

    try{
        // Claim USDC from deposit contract
        await claim(signer, config);

        // Swap USDC
        await swap(signer, config);

        // Send ETH to relayer
        // await refillRelayer();

        console.log(`Complete!`)
    } catch(e){
        console.error("Autotask failed!");
        console.error(e);
    }
}