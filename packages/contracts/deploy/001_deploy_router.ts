import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

import { getConfig } from "../config";

const { usdc, rootChainManager, usdcPredicate } = MAINNET_CONTRACTS;

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre;

    const { deployer } = await getNamedAccounts();

    await deployments.deploy("DepositRouter", {
        from: deployer,
        args: [usdc, rootChainManager, usdcPredicate, deployer, [deployer]],
        log: true,
    });
};

export default func;
