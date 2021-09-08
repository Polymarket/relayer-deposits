import { Signer } from "@ethersproject/abstract-signer";
import { BigNumber } from "@ethersproject/bignumber";
import { task } from "hardhat/config";
import { fundAccountETH } from "mainnet-fork-helpers";

import { TASK_FUND_ACCOUNT } from "./task-names";

const ONE_ETH = BigNumber.from(10).pow(18);

task(TASK_FUND_ACCOUNT, "Prints the list of accounts", async (_taskArgs, hre) => {
    const relayerWallet = hre.ethers.Wallet.fromMnemonic(process.env.MNEMONIC as string);
    // fund relayer
    await fundAccountETH(relayerWallet.address, ONE_ETH.mul(100000), hre.network.provider, hre.ethers.getSigner);
});
