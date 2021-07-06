import Koa from "koa";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";

// XXX: must import env which configures dotenv
import "./env";
import { getChain } from "./chains";
import getWallet from "./wallet";
import router from "./router";

const app = new Koa();
const port = process.env.PORT || process.env.SERVER_PORT || 5555;

app.use(bodyParser()).use(cors()).use(router.routes()).use(router.allowedMethods());

app.listen(port, () => {
    console.log(`Listening on port ${port}`);

    const wallet = getWallet(1);
    const relay = wallet.address;
    console.log("Relay account:", relay);
});

export default app;
