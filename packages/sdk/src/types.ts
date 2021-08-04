import { TypedDataDomain, TypedDataField } from "@ethersproject/abstract-signer";
import { Provider, TransactionResponse } from "@ethersproject/abstract-provider";
import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber } from "@ethersproject/bignumber";
import { Transaction } from "@ethersproject/transactions";

export type TypedDataSigner = {
    getAddress: () => Promise<string>;
    _signTypedData: (
        domain: TypedDataDomain,
        types: Record<string, Array<TypedDataField>>,
        value: Record<string, any>, // eslint-disable-line
    ) => Promise<string>;
    provider: JsonRpcProvider;
};

export type Signature = {
    v: number;
    r: string;
    s: string;
};

export type DepositProvider = Provider & {
    _wrapTransaction: (tx: Transaction) => TransactionResponse;
};

export type DepositResponse = TransactionResponse & { fee: BigNumber };

export type Relayer = {
    endpoint: string;
    fee: number;
    address: string;
};
