import { JsonRpcProvider } from "@ethersproject/providers";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

import { RELAY_INFO_TIMEOUT } from "../src/constants";
import { getRelayers } from "../src/depositContract";

dotenvConfig({ path: resolve(__dirname, "../../../.env") });

jest.mock("../src/axios", () => {
    return {
        getHttpClient: jest.fn().mockImplementation(() => {
            return {
                get: (_baseURL: string) =>
                    new Promise(resolve => {
                        setTimeout(() => {
                            resolve({});
                        }, RELAY_INFO_TIMEOUT + 1);
                    }),
            };
        }),
    };
});

describe("Relayer Timeout", () => {
    it("returns no relayers when the requests timeout", async () => {
        const provider = new JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);

        const relayers = await getRelayers(provider, 1 /* chainId */);

        expect(relayers.length).toBe(0);
    });
});
