// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "./interfaces/IERC20WithEIP3009.sol";
import "./interfaces/IRootChainManager.sol";

contract DepositRouter {
    IRootChainManager public rootChainManager;
    IERC20WithEIP3009 public rootToken;
    address public predicateContract;

    constructor(
        IERC20WithEIP3009 _rootToken,
        IRootChainManager _rootChainManager,
        address _predicateContract
    ) {
        rootToken = _rootToken;
        rootChainManager = _rootChainManager;
        predicateContract = _predicateContract;

        // hit predicateContract with a max approval
        rootToken.approve(predicateContract, type(uint).max);
    }

    /**
     * @dev deposit funds to Matic. Since this is expected to be called in a meta transaction and
     * `IRootChainManager.depositFor` relies on msg.sender, we transfer funds to this contract
     * and then `depositFor` on this contract to the `depositRecipient` on matic.
     * Note: RootChainManager has an `executeMetaTransaction` function but this method to deposit uses less gas.
     *
     * @param from - the address executing the deposit
     * @param depositRecipient - the address to receive the deposit on matic
     * @param value - the amount to deposit
     * @param validBefore - the deadline for executing the deposit
     * @param nonce - a unique random nonce for the deposit (NOT a sequential nonce see https://eips.ethereum.org/EIPS/eip-3009#unique-random-nonce-instead-of-sequential-nonce)
     * @param v, r, s - the EIP712 signature for `IERC20WithEIP3009.receiveWithAuthorization`
     */
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
        /**
         * receiveWithAuthorization rather than transferWithAuthorization to prevent front-running
         * attack where someone takes a transferWithAuthorization signature before the transaction has been mined
         * and executes the transfer so that this depositCall would fail and the funds would be stuck in
         * this contract.
         */
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
