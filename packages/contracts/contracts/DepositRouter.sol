// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./interfaces/IERC20WithEIP3009.sol";
import "./interfaces/IRootChainManager.sol";

contract DepositRouter is AccessControl {
    IRootChainManager public rootChainManager;
    IERC20WithEIP3009 public rootToken;
    address public predicateContract;

    // bytes32 public constant DEFAULT_ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000;

    // keccak256("RELAYER_ROLE")
    bytes32 public constant RELAYER_ROLE = 0xe2b7fb3b832174769106daebcfd6d1970523240dda11281102db9363b83b0dc4;

    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    constructor(
        IERC20WithEIP3009 _rootToken,
        IRootChainManager _rootChainManager,
        address _predicateContract,
        address admin,
        address[] memory relayers
    ) {
        rootToken = _rootToken;
        rootChainManager = _rootChainManager;
        predicateContract = _predicateContract;

        // hit predicateContract with a max approval
        rootToken.approve(predicateContract, type(uint256).max);

        // set up roles
        _setupRole(DEFAULT_ADMIN_ROLE, admin);

        for (uint256 i = 0; i < relayers.length; ++i) {
            _setupRole(RELAYER_ROLE, relayers[i]);
        }
    }

    function claimFees(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rootToken.transfer(to, amount);
    }

    /**
     * @dev deposit funds to Matic. Since this is expected to be called in a meta transaction and
     * `IRootChainManager.depositFor` relies on msg.sender, we transfer funds to this contract
     * and then `depositFor` on this contract to the `depositRecipient` on matic.
     * Note: RootChainManager has an `executeMetaTransaction` function but this method to deposit uses less gas.
     *
     * @param from - the address executing the deposit
     * @param depositRecipient - the address to receive the deposit on matic
     * @param totalValue - the amount to deposit
     * @param fee - the fee to pay for gas.
     * @param validBefore - the deadline for executing the deposit
     * @param nonce - a unique random nonce for the deposit (NOT a sequential nonce see
     *      https://eips.ethereum.org/EIPS/eip-3009#unique-random-nonce-instead-of-sequential-nonce)
     * @param receiveSig - the EIP712 signature for `IERC20WithEIP3009.receiveWithAuthorization`
     */
    function deposit(
        address from,
        address depositRecipient,
        uint256 totalValue,
        uint256 fee,
        uint256 validBefore,
        bytes32 nonce,
        Sig calldata receiveSig
    ) external onlyRole(RELAYER_ROLE) {
        /**
         * receiveWithAuthorization rather than transferWithAuthorization to prevent front-running
         * attack where someone takes a transferWithAuthorization signature before the transaction has been mined
         * and executes the transfer so that this depositCall would fail and the funds would be stuck in
         * this contract.
         */
        rootToken.receiveWithAuthorization(
            from,
            address(this),
            totalValue,
            0,
            validBefore,
            nonce,
            receiveSig.v,
            receiveSig.r,
            receiveSig.s
        );

        rootChainManager.depositFor(
            depositRecipient,
            address(rootToken),
            abi.encode(totalValue - fee) // will revert on underflow
        );
    }
}
