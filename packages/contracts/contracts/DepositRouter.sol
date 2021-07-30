// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IERC20WithEIP3009.sol";
import "./interfaces/IRootChainManager.sol";
import "./EnumerableSet.sol";

contract DepositRouter is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    event RelayRegistered(address indexed relay, string url);
    event DepositRelayed(address indexed relayer, address indexed depositor, uint256 amount, uint256 fee);

    IRootChainManager public rootChainManager;
    IERC20WithEIP3009 public rootToken;
    address public predicateContract;

    // fees for each relayer
    mapping(address => uint256) public fees;

    // stake required to become a relayer
    uint256 public stakeAmount;

    EnumerableSet.AddressSet private _relayers;

    mapping(address => string) public relayerUrl;

    // because stake amount can be changed by owner we need to track how much each staked
    mapping(address => uint256) public relayerStake;

    struct Sig {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    constructor(
        IERC20WithEIP3009 _rootToken,
        IRootChainManager _rootChainManager,
        address _predicateContract,
        address owner,
        uint256 _stakeAmount
    ) {
        rootToken = _rootToken;
        rootChainManager = _rootChainManager;
        predicateContract = _predicateContract;

        // hit predicateContract with a max approval
        rootToken.approve(predicateContract, type(uint256).max);

        stakeAmount = _stakeAmount;

        transferOwnership(owner);
    }

    function setStakeAmount(uint256 newAmount) external onlyOwner {
        stakeAmount = newAmount;
    }

    // register relayer
    function register(string calldata url) external payable {
        require(!_relayers.contains(msg.sender), "DepositRouter::register: relay already registered");
        require(msg.value >= stakeAmount, "DepositRouter:register: insufficient deposit amount");

        relayerStake[msg.sender] += stakeAmount;
        _relayers.add(msg.sender);
        relayerUrl[msg.sender] = url;

        // refund dust eth if any
        if (msg.value > stakeAmount) {
            (bool success, ) = msg.sender.call{ value: msg.value - stakeAmount }("");
            require(success, "DepositRouter:register: refund failed.");
        }

        emit RelayRegistered(msg.sender, url);
    }

    // remove relayer

    // owner remove of relayer

    function claimFees(address to, uint256 amount) external {
        require(fees[msg.sender] >= amount, "DepositRouter::claimFees: sender has not claimed sufficient fees.");

        fees[msg.sender] -= amount;

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
    ) external {
        // require relayer is registered
        require(_relayers.contains(msg.sender), "DepositRouter::deposit: relayer is not registered");

        // check eip712 signature for fee, gasPrice, msg.sender

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

        uint256 depositAmount = totalValue - fee;

        rootChainManager.depositFor(
            depositRecipient,
            address(rootToken),
            abi.encode(depositAmount) // will revert on underflow
        );

        fees[msg.sender] += fee;

        emit DepositRelayed(msg.sender, from, depositAmount, fee);
    }
}
