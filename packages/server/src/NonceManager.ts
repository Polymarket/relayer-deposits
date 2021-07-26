import { Wallet } from "@ethersproject/wallet";

import { getWallet } from "./utils";
import { isDefenderSetup } from "./defender";

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
    private nonces: Record<number, number>;

    constructor() {
        this.nonces = {};
    }

    static async currentNonce(chainId: number): Promise<number> {
        const wallet = getWallet(chainId);
        return wallet.provider.getTransactionCount(wallet.address);
    }

    private async setNonce(chainId): Promise<void> {
        const curNonce = await NonceManager.currentNonce(chainId);
        this.nonces[chainId] = curNonce;
    }

    private async checkNonceFresh(chainId: number): Promise<void> {
        const currentNonce = await NonceManager.currentNonce(chainId);
        if (this.nonces[chainId] - NONCE_STALE_THRESHOLD > currentNonce || this.nonces[chainId] < currentNonce) {
            this.nonces[chainId] = currentNonce;
        }
    }

    async getNonce(chainId: number): Promise<number | void> {
        if (isDefenderSetup(chainId)) return;

        if (!this.nonces[chainId]) {
            await this.setNonce(chainId);
        } else {
            await this.checkNonceFresh(chainId);
        }

        return this.nonces[chainId];
    }

    async incrementNonce(chainId): Promise<void> {
        if (isDefenderSetup(chainId)) return;

        if (!this.nonces[chainId]) {
            await this.setNonce(chainId);
        }

        this.nonces[chainId] += 1;
    }
}
