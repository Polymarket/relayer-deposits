import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

let envPath;
if (process.env.NODE_ENV === "production") {
    envPath = "../.env";
} else {
    envPath = "../../../.env";
}

dotenvConfig({ path: resolve(__dirname, envPath) });

if (!process.env.NETWORK_ID) {
    throw new Error("Environment must specify `NETWORK_ID`.");
}

const networkId = process.env.NETWORK_ID as string;

export const NETWORK_ID = parseInt(networkId, 10);

export const HUB_ADDRESS = "0xd216153c06e857cd7f72665e0af1d7d82172f494";

export const MATIC_GAS_PRICE = 2500000000;
