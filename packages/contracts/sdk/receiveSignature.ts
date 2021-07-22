import { BigNumber } from "@ethersproject/bignumber";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer";

import type { TypedDataSigner } from "./types";

export type ReceiveParams = {
    signer: TypedDataSigner;
    tokenName: string;
    contractVersion: string;
    chainId: number;
    verifyingContract: string;
    to: string;
    value: BigNumber;
    nonce: string;
    validAfter: number;
    validBefore: number;
};

const sign = async (
    signer: TypedDataSigner,
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>,
): Promise<string> => {
    const populated = await _TypedDataEncoder.resolveNames(domain, types, value, (name: string) => {
        return signer.provider.resolveName(name);
    });

    const address = await signer.getAddress();

    const message = JSON.stringify(_TypedDataEncoder.getPayload(populated.domain, types, populated.value));

    return signer.provider.send("eth_signTypedData_v4", [address.toLowerCase(), message]);
};

export const getReceiveSignature = async ({
    signer,
    tokenName,
    contractVersion,
    chainId,
    verifyingContract,
    to,
    value,
    nonce,
    validAfter,
    validBefore,
}: ReceiveParams): Promise<string> => {
    const domain = {
        name: tokenName,
        version: contractVersion,
        chainId: BigNumber.from(chainId).toHexString(),
        verifyingContract,
    };

    const types = {
        ReceiveWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
        ],
    };

    const eip712Value = {
        from: await signer.getAddress(),
        to,
        value,
        validAfter,
        validBefore,
        nonce,
    };
    const receiveSignature = await sign(signer, domain, types, eip712Value);
    return receiveSignature;
};
