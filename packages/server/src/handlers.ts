import { BigNumber } from "@ethersproject/bignumber";
import { Wallet } from "@ethersproject/wallet";
import { splitSignature } from "@ethersproject/bytes";
import { Signature } from "@polymarket/relayer-deposits";

import { getWallet, getFee } from "./utils";
import { getDepositContract } from "./depositContract";
import NonceManager from "./NonceManager";

const nonceManager = new NonceManager();

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
};

export const handleDeposit = async (ctx, next) => {
    await next();
    const {
        receiveSig,
        from,
        depositRecipient,
        totalValue,
        fee: userProvidedFee,
        validBefore,
        nonce,
        gasPrice: userProvidedGasPrice,
        chainId,
    } = (ctx.request.body as DepositRequestBody);

    ctx.assert(BigNumber.from(totalValue).gt(userProvidedFee), 400, "Deposit amount must be greater than the fee");

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

    // check gas price is fast to prevent slow gas price from slowing deposits
    const { fee: calculatedFee, gasPrice: calculatedGasPrice } = await getFee();

    const gasPrice = calculatedGasPrice.lt(userProvidedGasPrice) ? calculatedGasPrice : userProvidedGasPrice;

    const gasPriceMin = calculatedGasPrice.mul(90).div(100);
    ctx.assert(BigNumber.from(gasPrice).gt(gasPriceMin), 400, "Gas price lower than minimum accepted.");

    // check that the fee is acceptable
    const fee = calculatedFee.lt(userProvidedFee) ? calculatedFee : userProvidedFee;

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
            nonce,
            sig,
        );
    } catch (e) {
        ctx.throw(400, "Failed to estimate gas for deposit transaction. Transaction will likely fail.");
    }

    try {
        const relayerNonce = await nonceManager.getNonce(chainId);

        const tx = await depositContract.deposit(
            from,
            depositRecipient,
            totalValue,
            fee,
            validBefore,
            nonce,
            sig,
            {
                gasPrice,
                nonce: relayerNonce,
            },
        );

        console.log(`Sending tx with hash ${tx.hash}`);

        await nonceManager.incrementNonce(chainId);

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
