// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "./interfaces/IERC20EIP3009.sol";
import "./interfaces/IRootChainManager.sol";

contract DepositRouter {
    IRootChainManager public rootChainManager;
    IERC20EIP3009 public rootToken;
    address public predicateContract;

    constructor(
        IERC20EIP3009 _rootToken,
        IRootChainManager _rootChainManager,
        address _predicateContract
    ) {
        rootToken = _rootToken;
        rootChainManager = _rootChainManager;
        predicateContract = _predicateContract;

        // hit predicateContract with that max approval
        rootToken.approve(predicateContract, type(uint).max);
    }

    function deposit(
        address from,
        address depositRecipient,
        uint256 value,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        rootToken.receiveWithAuthorization(
            from,
            address(this),
            value,
            0,
            validBefore,
            nonce,
            v,
            r,
            s
        );

        rootChainManager.depositFor(
            depositRecipient,
            address(rootToken),
            abi.encode(value)
        );
    }
}
