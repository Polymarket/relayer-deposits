import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";

import { getContracts } from "@polymarket/relayer-deposits";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts, network } = hre;
    const { usdc, rootChainManager, usdcPredicate } = getContracts(network.config.chainId as number);

    const { deployer } = await getNamedAccounts();

    await deployments.deploy("DepositRouter", {
        from: deployer,
        args: [usdc, rootChainManager, usdcPredicate, deployer, BigNumber.from(10).pow(16)],
        log: true,
    });
};

export default func;
