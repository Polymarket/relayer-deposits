import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// biconomy doesn't run on goerli so not point deploying to other networks
import { MAINNET_CONTRACTS } from "../config";

const { usdc, rootChainManager, usdcPredicate } = MAINNET_CONTRACTS;

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre;

    const { deployer } = await getNamedAccounts();

    await deployments.deploy("DepositRouter", {
        from: deployer,
        args: [usdc, rootChainManager, usdcPredicate],
        log: true,
    });
};

export default func;
