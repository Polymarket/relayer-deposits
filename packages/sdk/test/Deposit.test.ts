/* eslint-env jest */
import { Wallet } from "@ethersproject/wallet";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { ContractReceipt } from "@ethersproject/contracts";

import { RelayProvider } from "../src";
import { getMockExternalProvider, getGreeter } from "./utils";
import { HUB_ADDRESS, RELAYERS } from "./env";

if (!process.env.MNEMONIC) {
    throw new Error("MNEMONIC must be set in env to run tests");
}

const wallet = Wallet.createRandom();

describe("GSN Relayer", () => {
    const gsnProvider = new RelayProvider([getMockExternalProvider(wallet)], RELAYERS, HUB_ADDRESS);
    const greeter = getGreeter(gsnProvider);
    let tx: TransactionResponse;
    const MESSAGE = "HELLO";

    it("can make a transaction", async () => {
        tx = await greeter.greet(MESSAGE);

        const receipt = (await tx.wait()) as ContractReceipt;

        const event = receipt?.events?.find((e: any) => e.event === "Greeted");

        expect(event?.args?.message).toBe(MESSAGE);
    }, 30000);
});
