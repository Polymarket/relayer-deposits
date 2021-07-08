import { BigNumber } from "@ethersproject/bignumber";
import { Wallet } from "@ethersproject/wallet";
import { splitSignature } from "@ethersproject/bytes";
import { Signature } from "@polymarket/relayer-deposits";

import getWallet from "./wallet";
import { getDepositContract } from "./depositContract";

type DepositRequestBody = {
    receiveSig: string;
    from: string;
    depositRecipient: string;
    totalValue: string; // hexstring
    fee: string; // hexstring
    validBefore: number;
    nonce: string; // hexstring
    gasPrice: string; // hexstring
    chainId: number;
}

const DEPOSIT_GAS = 162485;

export const handleDeposit = async (ctx, next) => {
    await next();
    const {
        receiveSig,
        from,
        depositRecipient,
        totalValue,
        fee,
        validBefore,
        nonce,
        gasPrice,
        chainId,
    } = (ctx.request.body as DepositRequestBody);

    let wallet: Wallet;
    try {
        // will throw on an unsupported chainId
        wallet = await getWallet(chainId);
    } catch (_e) {
        ctx.throw(400, "Unsupported chainId " + chainId);
    }

    const depositContract = getDepositContract(wallet, chainId);

    let sig: Signature;
    try {
        sig = splitSignature(receiveSig);
    } catch (e) {
        ctx.throw(400, `Error splitting signature: ${e.message}`);
    }

    // estimate gas on transaction to check validity
    try {
        await depositContract.estimateGas.deposit(
            from,
            depositRecipient,
            totalValue,
            fee,
            validBefore,
            nonce,
            sig,
        );
    } catch (e) {
        ctx.throw(400, "Failed to estimate gas for deposit transaction. Transaction will likely fail.");
    }

    // TODO: check gas price is fast to prevent slow gas price from slowing deposits

    // TODO: check that the fee is acceptable

    try {
        const tx = await depositContract.deposit(
            from,
            depositRecipient,
            totalValue,
            fee,
            validBefore,
            nonce,
            sig,
        );

        console.log(`Sending tx with hash ${tx.hash}`);

        ctx.body = {
            hash: tx.hash,
            nonce: tx.nonce,
            gasPrice: tx.gasPrice.toHexString(),
            gasLimit: tx.gasLimit.toHexString(),
            to: tx.to,
            value: tx.value.toHexString(),
            data: tx.data,
            v: tx.v,
            r: tx.r,
            s: tx.s,
            chainId,
        };
        ctx.status = 200;
    } catch (error) {
        ctx.body = {
            error: error.toString(),
        };
        ctx.status = 200;
    }
}
