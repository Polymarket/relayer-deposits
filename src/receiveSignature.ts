import { ethers, BigNumber, Signer } from "ethers";
import { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer";

type TypedDataSigner = {
    getAddress: () => Promise<string>;
    _signTypedData: (domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, any>) => Promise<string>
}

export type PermitParams = {
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
}

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
}: PermitParams): Promise<{ v: number; r: string; s: string }> => {
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
        ]
    };

    const eip712Value = {
        from: await signer.getAddress(),
        to,
        value,
        validAfter,
        validBefore,
        nonce,
    };

    const signature = await signer._signTypedData(domain, types, eip712Value);

    return ethers.utils.splitSignature(signature);
}
