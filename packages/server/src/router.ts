import Router from "koa-router";
import { BigNumber } from "@ethersproject/bignumber";

import getWallet from "./wallet";
import RelayHub from "./RelayHub";
import { NETWORK_ID } from "./env";

const PROXY_WALLET_FACTORY_ADDRESS = "0xab45c5a4b0c941a2f231c04c3f49182e1a254052";

const router = new Router();

router.get("/", async (ctx, next) => {
    await next();

    ctx.body = "Polymarket Deposit Relayer";
    ctx.status = 200;
});

router.post("/deposit", async (ctx, next) => {
    await next();
    const {
        from,
        to,
        gasPrice,
        gasLimit,
        relayFee,
        encodedFunction,
        RecipientNonce,
        signature,
        approvalData,
    } = ctx.request.body;

    ctx.assert(
        to.toLowerCase() === PROXY_WALLET_FACTORY_ADDRESS.toLowerCase() ||
            process.env.ONLY_PROXY_WALLET_TRANSACTIONS === "false",
        400,
        "Can only relay transactions to proxy wallet factory",
    );

    ctx.assert(BigNumber.from(gasPrice).lte(MAX_GAS_PRICE), 400, "Gas price higher than acceptable");
    ctx.assert(BigNumber.from(gasLimit).lte(MAX_GAS_LIMIT), 400, "Gas limit higher than acceptable");

    const wallet = hub.getWallet();

    const relay = wallet.address;

    const contract = hub.getContract();

    const canRelay = await contract.canRelay(
        relay,
        from,
        to,
        encodedFunction,
        relayFee,
        gasPrice,
        gasLimit,
        RecipientNonce,
        signature,
        approvalData,
    );

    ctx.assert(canRelay.status.isZero(), 400, getCanRelayErrorMessage(canRelay.status));

    try {
        const tx = await contract.relayCall(
            from,
            to,
            encodedFunction,
            relayFee,
            gasPrice,
            gasLimit,
            RecipientNonce,
            signature,
            approvalData,
            {
                gasPrice,
                gasLimit: (parseInt(gasLimit, 10) + gasPadding).toString(),
            },
        );

        console.log(`Sending tx with hash ${tx.hash}`);

        ctx.body = {
            hash: tx.hash,
            nonce: tx.nonce,
            gasPrice: tx.gasPrice.toHexString(),
            gas: tx.gasLimit.toHexString(),
            to: tx.to,
            value: tx.value.toHexString(),
            input: tx.data,
            v: tx.v,
            r: tx.r,
            s: tx.s,
            chainId: NETWORK_ID,
        };
        ctx.status = 200;
    } catch (error) {
        ctx.body = {
            error: error.toString(),
        };
        ctx.status = 200;
    }
});

router.post("/relay-info", async (ctx, next) => {
    await next();

    const wallet = getWallet(1);

    const balance = await wallet.provider.getBalance(wallet.address);

    ctx.body = {
        RelayerAddress: wallet.address,
        Balance: balance.toString(),
        Ready: true,
    };
    ctx.status = 200;
});

export default router;
