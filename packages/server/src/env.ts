import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

let envPath;
if (process.env.NODE_ENV === "production") {
    envPath = "../.env";
} else {
    envPath = "../../../.env";
}

dotenvConfig({ path: resolve(__dirname, envPath) });

if (!process.env.INFURA_API_KEY) {
    throw new Error("Environment must specify `INFURA_API_KEY`.");
}

export const defenderChainId = process.env.DEFENDER_CHAIN_ID && parseInt(process.env.DEFENDER_CHAIN_ID);
