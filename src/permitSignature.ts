import { ethers, BigNumber } from "ethers";

import type { TypedDataSigner } from "./types";

type PermitParams = {
    signer: TypedDataSigner;
    tokenName: string;
    contractVersion: string;
    chainId: number;
    verifyingContract: string;
    spender: string;
    value: BigNumber;
    nonce: BigNumber;
    deadline: number;
}

export const getPermitSignature = async ({
    signer,
    tokenName,
    contractVersion,
    chainId,
    verifyingContract,
    spender,
    value,
    nonce,
    deadline
}: PermitParams): Promise<{ v: number; r: string; s: string }> => {
    const domain = {
        name: tokenName,
        version: contractVersion,
        chainId,
        verifyingContract,
    };

    const types = {
        Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
        ]
    };

    const eip712Value = {
        owner: await signer.getAddress(),
        spender,
        value,
        nonce,
        deadline
    };

    const signature = await signer._signTypedData(domain, types, eip712Value);

    return ethers.utils.splitSignature(signature);
}
