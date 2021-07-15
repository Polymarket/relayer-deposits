import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

import { getContracts } from "../sdk";

const RELAYER_ADDRESS = "0x8236727B9458e11a1AB4A24bD8AE5CfeDc4c980C";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, network } = hre;
    const { usdc, rootChainManager, usdcPredicate } = getContracts(network.config.chainId as number);

    const { deployer } = await getNamedAccounts();

    await deployments.deploy("DepositRouter", {
        from: deployer,
        args: [usdc, rootChainManager, usdcPredicate, deployer, [RELAYER_ADDRESS]],
        log: true,
    });
};

export default func;
