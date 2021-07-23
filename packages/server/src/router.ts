import Router from "koa-router";

import { getSigner } from "./utils";
import { handleDeposit } from "./handlers";

const router = new Router();

router.get("/", async (ctx, next) => {
    await next();

    ctx.body = "Polymarket Deposit Relayer";
    ctx.status = 200;
});

router.post("/deposit", handleDeposit);

router.get("/relay-info", async (ctx, next) => {
    await next();

    const signer = getSigner(1);

    const relayAddress = await signer.getAddress();

    const balance = await signer.provider.getBalance(relayAddress);

    ctx.body = {
        RelayerAddress: relayAddress,
        Balance: balance.toString(),
        Ready: true,
    };
    ctx.status = 200;
});

export default router;
