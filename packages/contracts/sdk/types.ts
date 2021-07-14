import { TypedDataDomain, TypedDataField, Signer } from "@ethersproject/abstract-signer";
import { Provider } from "@ethersproject/abstract-provider";
import { BigNumber } from "@ethersproject/bignumber";
import { Transaction } from "@ethersproject/transactions";
import { TransactionResponse } from "@ethersproject/abstract-provider";

export type TypedDataSigner = {
    getAddress: () => Promise<string>;
    _signTypedData: (
        domain: TypedDataDomain,
        types: Record<string, Array<TypedDataField>>,
        value: Record<string, any>, // eslint-disable-line
    ) => Promise<string>;
};

export type Signature = {
    v: number;
    r: string;
    s: string;
};

export type DepositSigner = Signer & TypedDataSigner;

export type DepositProvider = Provider & {
    _wrapTransaction: (tx: Transaction) => TransactionResponse;
}

export type DepositResponse = TransactionResponse & { fee: BigNumber };
