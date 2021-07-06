import { Contract } from "@ethersproject/contracts";
import { Signer } from "@ethersproject/abstract-signer";
import { randomBytes } from "@ethersproject/random";
import { hexlify } from "@ethersproject/bytes";

export const getEip3009Nonce = async (signer: Signer, contractAddress: string): Promise<string> => {
    const eip3009Contract = new Contract(
        contractAddress,
        ["function authorizationState(address, bytes32) external view returns (bool)"],
        signer,
    );

    const signerAddress = await signer.getAddress();

    let nonce = "";

    // find a nonce that has not already been used
    let isNonceUsed = true;
    while (isNonceUsed) {
        nonce = hexlify(randomBytes(32));

        isNonceUsed = await eip3009Contract.authorizationState(signerAddress, nonce); // eslint-disable-line
    }

    return nonce;
};
