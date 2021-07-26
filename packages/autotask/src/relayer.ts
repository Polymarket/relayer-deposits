import { Signer } from "@ethersproject/abstract-signer";
import { Config } from "./config";


export const getRecipientRelayer = async (signer: Signer, config: Config) : Promise<string> => {
    const relayers = config.relayers.map(i=>i);

    // TODO: Fetch strategy var, 
    //Fetches the relayer with lowest ETH balance

    return relayers[0];
}