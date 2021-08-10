import { BigNumber } from "@ethersproject/bignumber";
import { Transaction } from "@ethersproject/transactions";
import { JsonRpcSigner } from "@ethersproject/providers";

import { getEip3009Nonce, getDepositNonce } from "./utils/nonce";
import { getReceiveSignature } from "./utils/receiveSignature";
import { DepositProvider, DepositResponse, Relayer, RelayerFee } from "./types";
import { getContracts, getSigChainId, getRouterAddress } from "./networks";
import { TOKEN_NAME, TOKEN_VERSION } from "./constants";
import { getDepositSignature } from "./utils/depositSignature";
import { getFeeFromGasPrice } from "./fees";
import { DepositError } from "./DepositError";
import { getHttpClient } from "./utils/axios";

export class DepositClient {
    readonly chainId: number;

    readonly signer: JsonRpcSigner;

    readonly provider: DepositProvider;

    readonly maxFee: RelayerFee;

    constructor(signer: JsonRpcSigner, maxFee: RelayerFee, chainId: number) {
        if (!signer.provider) {
            throw new Error("Signer must be connected to a provider.");
        }

        this.chainId = chainId;
        this.signer = signer;
        this.provider = signer.provider as DepositProvider;
        this.maxFee = maxFee;
    }

    async deposit({
        value,
        ethPrice,
        gasPrice,
        maxBlock,
        depositRecipient,
        relayers,
    }: {
        value: BigNumber;
        ethPrice: string;
        gasPrice: BigNumber;
        maxBlock: number;
        depositRecipient: string;
        relayers: Relayer[];
    }): Promise<DepositResponse> {
        const validBefore = Math.floor(Date.now() / 1000 + 3600);

        const { usdc } = getContracts(this.chainId);

        const receiveNonce = await getEip3009Nonce(this.signer, usdc);

        const receiveSig = await getReceiveSignature({
            signer: this.signer,
            tokenName: TOKEN_NAME,
            contractVersion: TOKEN_VERSION,
            chainId: getSigChainId(this.chainId),
            verifyingContract: usdc,
            to: getRouterAddress(this.chainId),
            value,
            nonce: receiveNonce,
            validBefore,
            validAfter: 0,
        });

        const depositNonce = await getDepositNonce(this.signer, this.chainId);

        const errors: string[] = [];

        for (let i = 0; i < relayers.length; i += 1) {
            try {
                const depositResponse = await this.depositWithRelayer({
                    validBefore,
                    receiveSig,
                    depositRecipient,
                    depositNonce,
                    gasPrice,
                    maxBlock,
                    ethPrice,
                    relayer: relayers[i],
                    value,
                    receiveNonce,
                });

                return depositResponse;
            } catch (error) {
                let errorMessage: string;
                if (error.response) {
                    errorMessage = `Deposit failed with status code ${error.response.status}: ${error.response.data}`;
                } else {
                    errorMessage = error.message || error.error || error;
                }

                errors.push(errorMessage);
            }
        }

        throw new DepositError("Unable to submit the deposit", errors);
    }

    private async depositWithRelayer({
        value,
        receiveNonce,
        receiveSig,
        validBefore,
        depositRecipient,
        depositNonce,
        gasPrice,
        maxBlock,
        ethPrice,
        relayer,
    }: {
        value: BigNumber;
        receiveNonce: string;
        receiveSig: string;
        validBefore: number;
        depositRecipient: string;
        depositNonce: BigNumber;
        gasPrice: BigNumber;
        maxBlock: number;
        ethPrice: string;
        relayer: Relayer;
    }): Promise<DepositResponse> {
        if (relayer.fees.standardFee > this.maxFee.standardFee)
            throw new Error("Relayer fee is greater than maximum fee");
        if (BigNumber.from(relayer.fees.minFee).gt(this.maxFee.minFee))
            throw new Error("Relayer minFee is greater than maximum accepted min fee");

        const fee = getFeeFromGasPrice(gasPrice, ethPrice, relayer.fees, value);

        const depositSig = await getDepositSignature({
            signer: this.signer,
            chainId: getSigChainId(this.chainId),
            verifyingContract: getRouterAddress(this.chainId),
            relayer: relayer.address,
            depositRecipient,
            fee,
            maxBlock,
            nonce: depositNonce,
        });

        const { data } = await getHttpClient(relayer.endpoint).post("/deposit", {
            receiveSig,
            depositSig,
            from: await this.signer.getAddress(),
            depositRecipient,
            totalValue: value.toHexString(),
            fee: fee.toHexString(),
            validBefore,
            receiveNonce,
            maxBlock,
            gasPrice: gasPrice.toHexString(),
            chainId: this.chainId,
        });

        return {
            ...this.provider._wrapTransaction(DepositClient.formatTransaction(data)),
            fee: BigNumber.from(data.fee),
        };
    }

    static formatTransaction(txData: {
        hash: string;
        nonce: number;
        gasPrice?: string;
        maxPriorityFeePerGas?: string;
        maxFeePerGas?: string;
        gasLimit: string;
        to: string;
        value: string;
        data: string;
        v: number;
        r: string;
        s: string;
        chainId: number;
    }): Transaction {
        return {
            ...txData,
            gasPrice: txData.gasPrice ? BigNumber.from(txData.gasPrice) : undefined,
            maxPriorityFeePerGas: txData.maxPriorityFeePerGas ? BigNumber.from(txData.maxPriorityFeePerGas) : undefined,
            maxFeePerGas: txData.maxFeePerGas ? BigNumber.from(txData.maxFeePerGas) : undefined,
            gasLimit: BigNumber.from(txData.gasLimit),
            value: BigNumber.from(txData.value),
        };
    }
}
