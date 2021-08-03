import { _TypedDataEncoder } from "@ethersproject/hash";
import { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer";
import { JsonRpcSigner } from "@ethersproject/providers";

export const signTypedData = async (
    signer: JsonRpcSigner,
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>, // eslint-disable-line
): Promise<string> => {
    const populated = await _TypedDataEncoder.resolveNames(domain, types, value, (name: string) => {
        return signer.provider.resolveName(name);
    });

    const address = await signer.getAddress();

    const message = JSON.stringify(_TypedDataEncoder.getPayload(populated.domain, types, populated.value));

    return signer.provider.send("eth_signTypedData_v4", [address.toLowerCase(), message]);
};
