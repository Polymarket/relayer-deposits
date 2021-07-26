import { RelayerParams } from 'defender-relay-client/lib/relayer';
import DepositContractAbi from "./abi/DepositContractAbi";
import * as dotenv from "dotenv";
import { Contract, ethers } from 'ethers';
import { getRelayerSigner } from './utils';
import ERC20Abi from './abi/ERC20';


const DEPOSIT_CONTRACT_ADDRESS = "0xf018963152c5c2cA112964311e91Ff664C041087";
const GOERLI_USDC_ADDRESS = "0x6847E4fa1EE2Af7e2E62793CBdf4E39957c71C50";

//TODO: flow:
//1. Claim usdc fees to admin from deposit contract if above threshold(configurable)
//2. Admin swaps for ETH
//3. Admin sends to relayers(which one? random? round robin? unclear.)

async function handler(credentials: RelayerParams){
    console.log(`In autotask handler...`);
    const signer = getRelayerSigner(credentials);

    const depositContract = new Contract(DEPOSIT_CONTRACT_ADDRESS, DepositContractAbi, signer);
    const usdc = new Contract(GOERLI_USDC_ADDRESS, ERC20Abi, signer);

    const usdcBalance = await usdc.balanceOf(depositContract.address);
    console.log(`USDC Balance on deposit contract: ${usdcBalance}`);

}