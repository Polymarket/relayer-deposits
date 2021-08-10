import { BigNumber } from "@ethersproject/bignumber";
import { JsonRpcSigner } from "@ethersproject/providers";

import { _TypedDataEncoder } from "@ethersproject/hash";

import { signTypedData } from "./signTypedData";
import { DEPOSIT_CONTRACT_NAME } from "../constants";

export type DepositSignatureParams = {
    signer: JsonRpcSigner;
    chainId: number;
    verifyingContract: string;
    relayer: string;
    depositRecipient: string;
    fee: BigNumber;
    maxBlock: number;
    nonce: BigNumber;
};

export const getDepositSignature = async ({
    signer,
    chainId,
    verifyingContract,
    relayer,
    depositRecipient,
    fee,
    maxBlock,
    nonce,
}: DepositSignatureParams): Promise<string> => {
    const domain = {
        name: DEPOSIT_CONTRACT_NAME,
        chainId: BigNumber.from(chainId).toHexString(),
        verifyingContract,
    };

    const types = {
        Deposit: [
            { name: "relayer", type: "address" },
            { name: "depositRecipient", type: "address" },
            { name: "fee", type: "uint256" },
            { name: "maxBlock", type: "uint256" },
            { name: "nonce", type: "uint256" },
        ],
    };

    const eip712Value = {
        relayer,
        depositRecipient,
        fee,
        maxBlock,
        nonce,
    };

    return signTypedData(signer, domain, types, eip712Value);
};
