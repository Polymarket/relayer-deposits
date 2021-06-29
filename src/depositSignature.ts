import { ethers, BigNumber } from "ethers";

import type { TypedDataSigner, Signature } from "./types";

export type DepositParams = {
    signer: TypedDataSigner;
    contractName: string;
    chainId: number;
    verifyingContract: string;
    depositRecipient: string;
    totalValue: BigNumber;
    fee: BigNumber;
    nonce: BigNumber;
};

export const getDepositSignature = async ({
    signer,
    contractName,
    chainId,
    verifyingContract,
    depositRecipient,
    totalValue,
    fee,
    nonce,
}: DepositParams): Promise<Signature> => {
    const domain = {
        name: contractName,
        chainId: BigNumber.from(chainId).toHexString(),
        verifyingContract,
    };

    const types = {
        Deposit: [
            { name: "depositRecipient", type: "address" },
            { name: "totalValue", type: "uint256" },
            { name: "fee", type: "uint256" },
            { name: "nonce", type: "uint256" },
        ]
    };

    const eip712Value = {
        depositRecipient,
        totalValue,
        fee,
        nonce,
    };

    const signature = await signer._signTypedData(domain, types, eip712Value);

    return ethers.utils.splitSignature(signature);
}
