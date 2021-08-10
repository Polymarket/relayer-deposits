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

if (!process.env.CHAIN_ID) {
    throw new Error("Environment must specific `CHAIN_ID`");
}

export const chainId = parseInt(process.env.CHAIN_ID);
