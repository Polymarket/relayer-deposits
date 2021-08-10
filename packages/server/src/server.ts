import Koa from "koa";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";

// XXX: must import env which configures dotenv
import { chainId } from "./env";
import { getSigner } from "./utils";
import router from "./router";
import { maybeRegister } from "./depositContract";

const app = new Koa();
const port = process.env.PORT || process.env.SERVER_PORT || 5555;

app.use(bodyParser()).use(cors()).use(router.routes()).use(router.allowedMethods());

app.listen(port, async () => {
    console.log(`Listening on port ${port}`);

    const signer = await getSigner();
    const relay = await signer.getAddress();
    console.log("Relay account:", relay);

    await maybeRegister(chainId);
});

export default app;
