import { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer";

export type TypedDataSigner = {
    getAddress: () => Promise<string>;
    _signTypedData: (domain: TypedDataDomain, types: Record<string, Array<TypedDataField>>, value: Record<string, any>) => Promise<string>
};

export type Signature = {
    v: number;
    r: string;
    s: string;
};
