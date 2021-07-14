import Router from "koa-router";

import { getWallet } from "./utils";
import { handleDeposit } from "./handlers";

const router = new Router();

router.get("/", async (ctx, next) => {
    await next();

    ctx.body = "Polymarket Deposit Relayer";
    ctx.status = 200;
});

router.post("/deposit", handleDeposit);

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
