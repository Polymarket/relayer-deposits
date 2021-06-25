// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "./interfaces/IPermitToken.sol";
import "./interfaces/IRootChainManager.sol";

contract DepositRouter {
    IRootChainManager public rootChainManager;
    IPermitToken public rootToken;
    address public predicateContract;

    constructor(
        IPermitToken _rootToken,
        IRootChainManager _rootChainManager,
        address _predicateContract
    ) {
        rootToken = _rootToken;
        rootChainManager = _rootChainManager;
        predicateContract = _predicateContract;
    }

    function permitAndDeposit(
        address owner,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        rootToken.permit(
            owner,
            predicateContract,
            value,
            deadline,
            v,
            r,
            s
        );

        rootChainManager.depositFor(
            owner,
            address(rootToken),
            abi.encode(value)
        );
    }
}
