// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./interfaces/IERC20WithEIP3009.sol";
import "./interfaces/IRootChainManager.sol";

contract DepositRouter is Ownable {
    IRootChainManager public rootChainManager;
    IERC20WithEIP3009 public rootToken;
    address public predicateContract;

    mapping(address => uint256) public nonces;

    string public constant name = "PM DepositRouter v1";
    bytes32 public domainSeparator;

    // The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
    );

    // The EIP-712 typehash for the claim id struct
    bytes32 public constant DEPOSIT_TYPEHASH = keccak256(
        "Deposit(address depositRecipient,uint256 totalValue,uint256 fee,uint256 nonce)"
    );

    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    constructor(
        IERC20WithEIP3009 _rootToken,
        IRootChainManager _rootChainManager,
        address _predicateContract,
        address owner
    ) {
        rootToken = _rootToken;
        rootChainManager = _rootChainManager;
        predicateContract = _predicateContract;

        // hit predicateContract with a max approval
        rootToken.approve(predicateContract, type(uint).max);

        domainSeparator = keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256(bytes(name)),
            _getChainId(),
            address(this)
        ));

        transferOwnership(owner);
    }

    function claimFees(address to, uint256 amount) external onlyOwner {
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
     * @param fee - the fee to pay for gas. Expected that this function is called by a relayer who controls this contract.
     * @param validBefore - the deadline for executing the deposit
     * @param nonce - a unique random nonce for the deposit (NOT a sequential nonce see https://eips.ethereum.org/EIPS/eip-3009#unique-random-nonce-instead-of-sequential-nonce)
     * @param receiveSig - the EIP712 signature for `IERC20WithEIP3009.receiveWithAuthorization`
     * @param depositSig - the EIP712 signature to verify the `from` has approved the deposit and gas fee
     */
    function deposit(
        address from,
        address depositRecipient,
        uint256 totalValue,
        uint256 fee,
        uint256 validBefore,
        bytes32 nonce,
        Sig calldata receiveSig,
        Sig calldata depositSig
    ) external {
        bytes32 structHash = keccak256(abi.encode(DEPOSIT_TYPEHASH, depositRecipient, totalValue, fee, nonces[from]++));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        require(ECDSA.recover(digest, depositSig.v, depositSig.r, depositSig.s) == from, "EIP712 invalid deposit signature");

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

    function _getChainId() internal view returns (uint) {
        uint chainId;
        assembly { chainId := chainid() }
        return chainId;
    }
}
