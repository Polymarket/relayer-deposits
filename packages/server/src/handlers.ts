import { BigNumber } from "@ethersproject/bignumber";
import { Signer } from "@ethersproject/abstract-signer";
import { splitSignature } from "@ethersproject/bytes";
import { Signature } from "@polymarket/relayer-deposits";

import { getSigner, getFee } from "./utils";
import { getDepositContract } from "./depositContract";
import NonceManager from "./NonceManager";
import { chainId } from "./env";
import { getIsDefenderSetup } from "./defender";

const nonceManager = new NonceManager();

type DepositRequestBody = {
    receiveSig: string;
    depositSig: string;
    from: string;
    depositRecipient: string;
    totalValue: string; // hexstring
    fee: string; // hexstring
    validBefore: number;
    receiveNonce: string; // hexstring
    chainId: number;
    maxBlock: number;
};

export const handleDeposit = async (ctx, next) => {
    await next();
    const {
        receiveSig: receiveSigRaw,
        depositSig: depositSigRaw,
        from,
        depositRecipient,
        totalValue,
        fee,
        validBefore,
        receiveNonce,
        chainId: requestedChainId,
        maxBlock,
    } = (ctx.request.body as DepositRequestBody);

    ctx.assert(chainId === requestedChainId, 400, `Requested deposit on chainId ${requestedChainId} but server only accepts deposits on ${chainId}`);

    ctx.assert(BigNumber.from(totalValue).gt(fee), 400, "Deposit amount must be greater than the fee");

    let signer: Signer;
    try {
        // will throw on an unsupported chainId
        signer = await getSigner();
    } catch (_e) {
        ctx.throw(400, "Unsupported chainId " + chainId);
    }

    const depositContract = getDepositContract(signer, chainId);

    let receiveSig: Signature;
    try {
        receiveSig = splitSignature(receiveSigRaw);
    } catch (e) {
        ctx.throw(400, `Error splitting signature: ${e.message}`);
    }

    let depositSig: Signature;
    try {
        depositSig = splitSignature(depositSigRaw);
    } catch (e) {
        ctx.throw(400, `Error splitting signature ${e.message}`);
    }

    // check gas price is fast to prevent slow gas price from slowing deposits
    const { fee: calculatedFee } = await getFee();

    // check that fee is acceptable
    const feeMin = calculatedFee.mul(90).div(100);
    ctx.assert(BigNumber.from(fee).gt(feeMin), 400, "Fee lower than minimum accepted fee.");

    // estimate gas on transaction to check validity
    try {
        await depositContract.estimateGas.deposit(
            from,
            depositRecipient,
            totalValue,
            fee,
            validBefore,
            receiveNonce,
            maxBlock,
            receiveSig,
            depositSig,
        );
    } catch (e) {
        ctx.throw(400, `Failed to estimate gas for deposit transaction. Transaction will likely fail. Message: ${e.message}`);
    }

    try {
        const isDefenderSetup = await getIsDefenderSetup();

        const txOptions = isDefenderSetup ? {} : { nonce: await nonceManager.getNonce() };

        const tx = await depositContract.deposit(
            from,
            depositRecipient,
            totalValue,
            fee,
            validBefore,
            receiveNonce,
            maxBlock,
            receiveSig,
            depositSig,
            txOptions,
        );

        console.log(`Sending tx with hash ${tx.hash}`);

        isDefenderSetup && await nonceManager.incrementNonce();

        ctx.body = {
            hash: tx.hash,
            nonce: tx.nonce,
            gasPrice: tx.gasPrice && tx.gasPrice.toHexString(),
            gasLimit: tx.gasLimit.toHexString(),
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas && tx.maxPriorityFeePerGas.toHexString(),
            maxFeePerGas: tx.maxFeePerGas && tx.maxFeePerGas.toHexString(),
            to: tx.to,
            value: tx.value.toHexString(),
            data: tx.data,
            v: tx.v,
            r: tx.r,
            s: tx.s,
            chainId,
            fee,
        };
        ctx.status = 200;
    } catch (error) {
        ctx.body = {
            error: error.toString(),
        };
        ctx.status = 400;
    }
}
