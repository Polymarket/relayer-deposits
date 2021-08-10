
import { Wallet } from "@ethersproject/wallet";

import { getWallet } from "./utils";
import { getIsDefenderSetup } from "./defender";

/*
 * If transactions are dropped, our nonce will continue incrementing so subsequent
 * transactions will have too high of a nonce to go through. Whenever cached_nonce - network_nonce
 * is over this threshold we assume that a transaction was dropped and reset the nonce.
 *
 * The higher this threshold is the more transactions that will fail after a transaction is dropped.
 * The lower the threshold, the more likely it is that transactions will fail because there's many in the same block.
 * Ideally this threshold should be the maximum amound of transactions this relayer may send in a block.
 */
const NONCE_STALE_THRESHOLD = 10;

export default class NonceManager {
    private wallet: Wallet;
    private nonce: number;

    constructor() {
        this.wallet = getWallet();
        this.nonce = 0;
    }

    async currentNonce(): Promise<number> {
        return this.wallet.provider.getTransactionCount(this.wallet.address);
    }

    async setNonce(): Promise<void> {
        this.nonce = await this.currentNonce();
    }

    async checkNonceFresh(): Promise<void> {
        const currentNonce = await this.currentNonce();
        if (this.nonce - NONCE_STALE_THRESHOLD > currentNonce || this.nonce < currentNonce) {
            this.nonce = currentNonce;
        }
    }

    async getNonce(): Promise<number | void> {
        if (await getIsDefenderSetup()) return;

        if (!this.nonce) {
            await this.setNonce();
        } else {
            await this.checkNonceFresh();
        }

        return this.nonce as number;
    }

    async incrementNonce(): Promise<void> {
        if (await getIsDefenderSetup()) return;

        if (!this.nonce) {
            await this.setNonce();
        }

        this.nonce += 1;
    }
}
