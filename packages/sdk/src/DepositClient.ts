import axios from "axios";
import { BigNumber } from "@ethersproject/bignumber";
import { Transaction } from "@ethersproject/transactions";
import { JsonRpcSigner } from "@ethersproject/providers";

import { getEip3009Nonce, getDepositNonce } from "./nonce";
import { getReceiveSignature } from "./receiveSignature";
import { DepositProvider, DepositResponse } from "./types";
import { getContracts, getSigChainId, getRouterAddress } from "./networks";
import { TOKEN_NAME, TOKEN_VERSION } from "./constants";
import { getDepositSignature } from "./depositSignature";

export class DepositClient {
    readonly httpClient: any;

    readonly chainId: number;

    readonly signer: JsonRpcSigner;

    readonly provider: DepositProvider;

    constructor(signer: JsonRpcSigner, baseURL: string, chainId: number) {
        if (!signer.provider) {
            throw new Error("Signer must be connected to a provider.");
        }

        this.httpClient = axios.create({
            baseURL,
            headers: { "Content-Type": "application/json" },
        });

        this.chainId = chainId;
        this.signer = signer;
        this.provider = signer.provider as DepositProvider;
    }

    async deposit(
        value: BigNumber,
        fee: BigNumber,
        gasPrice: BigNumber,
        depositRecipient: string,
    ): Promise<DepositResponse> {
        const validBefore = Math.floor(Date.now() / 1000 + 3600);

        const { usdc } = getContracts(this.chainId);

        const nonce = await getEip3009Nonce(this.signer, usdc);

        const receiveSig = await getReceiveSignature({
            signer: this.signer,
            tokenName: TOKEN_NAME,
            contractVersion: TOKEN_VERSION,
            chainId: getSigChainId(this.chainId),
            verifyingContract: usdc,
            to: getRouterAddress(this.chainId),
            value,
            nonce,
            validBefore,
            validAfter: 0,
        });

        console.log("getting deposit nonce");

        const depositNonce = await getDepositNonce(this.signer, this.chainId);

        console.log({ depositNonce });

        const depositSig = await getDepositSignature({
            signer: this.signer,
            chainId: getSigChainId(this.chainId),
            verifyingContract: getRouterAddress(this.chainId),
            depositRecipient,
            fee,
            gasPrice,
            nonce: depositNonce,
        });

        const { data } = await this.httpClient.post("/deposit", {
            receiveSig,
            depositSig,
            from: await this.signer.getAddress(),
            depositRecipient,
            totalValue: value.toHexString(),
            fee: fee.toHexString(),
            validBefore,
            nonce,
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
        gasPrice: string;
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
            gasPrice: BigNumber.from(txData.gasPrice),
            gasLimit: BigNumber.from(txData.gasLimit),
            value: BigNumber.from(txData.value),
        };
    }
}
