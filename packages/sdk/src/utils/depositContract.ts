import { Contract } from "@ethersproject/contracts";
import { Signer } from "@ethersproject/abstract-signer";
import { Provider } from "@ethersproject/abstract-provider";

import { getRouterAddress } from "../networks";

export const getDepositContract = (signerOrProvider: Signer | Provider, chainId: number): Contract => {
    return new Contract(
        getRouterAddress(chainId),
        [
            "function depositNonces(address) external view returns (uint256)",
            "function getRelayersWithUrls() external view returns (bytes[] memory)",
        ],
        signerOrProvider,
    );
};
