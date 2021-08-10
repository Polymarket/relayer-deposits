import Router from "koa-router";

import { getSigner, RELAYER_FEE } from "./utils";
import { handleDeposit } from "./handlers";

const router = new Router();

router.get("/", async (ctx, next) => {
    await next();

    ctx.body = "Deposit Relayer";
    ctx.status = 200;
});

router.post("/deposit", handleDeposit);

router.get("/relay-info", async (ctx, next) => {
    await next();

    const signer = await getSigner();

    const relayAddress = await signer.getAddress();

    const balance = await signer.provider.getBalance(relayAddress);

    ctx.body = {
        relayerAddress: relayAddress,
        balance: balance.toString(),
        ready: true,
        standardFee: RELAYER_FEE.standardFee,
        minFee: RELAYER_FEE.minFee,
    };
    ctx.status = 200;
});

export default router;
