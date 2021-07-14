import axios from "axios";
import { BigNumber } from "@ethersproject/bignumber";
import { Transaction } from "@ethersproject/transactions";

import { getEip3009Nonce } from "./nonce";
import { getReceiveSignature } from "./receiveSignature";
import { TypedDataSigner, DepositSigner, DepositProvider, DepositResponse } from "./types";
import { getContracts, getReceiveSigChainId, getRouterAddress } from "./networks";
import { TOKEN_NAME, TOKEN_VERSION } from "./constants";
import { getGasPriceAndFee } from "./fees";

export class DepositClient {
    readonly httpClient: any;
    readonly chainId: number;
    readonly signer: DepositSigner;
    readonly provider: DepositProvider;

    constructor(signer: DepositSigner, baseURL: string, chainId: number) {
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

    async deposit (
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
            chainId: getReceiveSigChainId(this.chainId),
            verifyingContract: usdc,
            to: getRouterAddress(this.chainId),
            value,
            nonce,
            validBefore,
            validAfter: 0,
        });

        const { data } = await this.httpClient.post("/deposit", {
            receiveSig,
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
            ...this.provider._wrapTransaction(
                this.formatTransaction(data)
            ),
            fee: BigNumber.from(data.fee),
        }
    }

    formatTransaction (txData: {
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
        }
    }
}
