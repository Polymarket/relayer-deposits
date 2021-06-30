import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

import { getContracts } from "../config";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, network } = hre;
    const { usdc, rootChainManager, usdcPredicate } = getContracts(network.config.chainId as number);

    const { deployer } = await getNamedAccounts();

    await deployments.deploy("DepositRouter", {
        from: deployer,
        args: [usdc, rootChainManager, usdcPredicate, deployer, [deployer]],
        log: true,
    });
};

export default func;
