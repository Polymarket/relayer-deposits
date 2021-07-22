import { ExternalProvider, JsonRpcProvider, Web3Provider, JsonRpcSigner } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import { Networkish } from "@ethersproject/networks";
import { arrayify } from "@ethersproject/bytes";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

export type SendPayload = { method: string; params?: Array<any>; id?: any };

export type SendCallback = (error: any, response?: any) => void;

const getJsonProvider = () => new JsonRpcProvider("http://localhost:8545", 31337);

const getMockExternalProvider = (wallet: Wallet | SignerWithAddress): ExternalProvider => ({
    send: (request: SendPayload, callback: SendCallback) => {
        switch (request.method) {
            case "eth_sign": {
                const sig = wallet.signMessage(arrayify(request?.params && request.params[1]));
                callback(null, { result: sig });
                return;
            }
            case "eth_accounts": {
                callback(null, { result: [wallet.address] });
                return;
            }
            case "eth_signTypedData_v4": {
                const args = JSON.parse(request?.params && request?.params[1]);
                delete args.types.EIP712Domain;
                const sig = wallet._signTypedData(args.domain, args.types, args.message);
                callback(null, { result: sig });
                return;
            }
            default: {
                const provider = getJsonProvider();
                provider
                    .send(request.method, request?.params || [])
                    .then((result: any) => {
                        callback(null, { result });
                    })
                    .catch((err: any) => {
                        callback({ error: err.toString() }, null);
                    });
            }
        }
    },
});

export const getSignerFromWallet = (wallet: Wallet | SignerWithAddress, network: Networkish): JsonRpcSigner => {
    return new Web3Provider(getMockExternalProvider(wallet), network).getSigner();
};
