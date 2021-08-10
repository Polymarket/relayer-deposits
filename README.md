# Polymarket Deposit Relayer

## SDK

`yarn add @polymarket/relayer-deposits`

### Deposit Flow

```jsx
import { DepositClient, getGasPriceAndFee, getRelayers } from "@polymarket/relayer-deposits";

const maximumAcceptedFees = { standardFee: 0.003, minFee: BigNumber.from(10).pow(6).mul(3) }, // maximum accepted fees. standard fee is in bps of total deposit and minFee is the minimum added to a transaction fee when the deposit amount is low

const relayers = await getRelayers(
  provider, // an ethers.js provider
  1, // chainId
  maximumAcceptedFees, // optional maximum accepted fees which we'll filter relayers out with
);

const { gasPrice, ethPrice } = await getGasPriceAndFee(
  // mainnet ethers Provider (we're using chainlink to get the eth price which isn't on goerli
  mainnetProvider,
  relayerFee, // pass in maximum accepted fee to estimate the fee for the user
  depositAmount, // the amount the user wants to deposit
  { gasStationKey: GAS_STATION_API_KEY }
);

const client = new DepositClient(
  signer, // ethers Signer (must be connected to an ethers Provider)
  maximumAcceptedFees,
  1, // network id
);

const txResponse = await client.deposit({
  value: depositAmount,
  fee,
  gasPrice,
  ethPrice,
  maxBlock: (await provider.getCurrentBlock()) + 5
  depositRecipient,
  relayers
});

const txReceipt = await txResponse.wait()
```

DepositClient.deposit() returns Promise<TransactionResponse & { fee: BigNumber }> where TransactionResponse is an ethers.js [TransactionResponse](https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse) and the fee is the actual fee paid on the deposit. The relayer picks the lesser of the fee from the request and the fee it calculates itself so the fee may be less than what the user agreed to.

## Gas Price Too Low Error

Status Code: 400

Response Data: "Gas price lower than minimum accepted."

- relayer checks that the gasPrice is sufficient because a low gas price on one transaction will prevent subsequent transactions from going through.
- expect to see when gas prices increase drastically after quoting the user their fee. When this error occurs we should show the user the updated fee and tell them that network fee just increased drastically.
- One way to prevent this error is to overquote users in the UI. The relay server will use the lesser of the fee and gas price provided by the user and calculated on the server. There's an option on `getGasPriceAndFee` `gasMultiplier` which will automatically calculate the gasPrice as `gasPrice = actualGasPrice.mul(gasMultiplier).div(100)` because BigNumber math (this could be made more intuitive by using mulBN in [https://github.com/Polymarket/amm-maths/blob/master/src/utils.ts](https://github.com/Polymarket/amm-maths/blob/master/src/utils.ts)).

## Other Errors

### Fee Too Low

Status Code: 400

Response Data: "Fee lower than minimum accepted fee."

- This error will only happen if the client provided fee is insufficient and incorrectly calculated. The relayer checks that the gas price is sufficient before checking the fee. If `getGasPriceAndFee` is used this error should never be thrown.

### Fee Greater than Deposit

Status Code: 400

Response Data: "Deposit amount must be greater than the fee"

- The fee is greater than the deposit amount

### Unsupported Chain Id

Status Code: 400

Response Data: "Unsupported chainId " + chainId

- The chainId passed into the constructor for DepositClient is not supported by the relayer. The supported chains are mainnet and goerli (and localhost for testing).

### Estimate Gas Failure

Status Code: 400

Response Data: "Failed to estimate gas for deposit transaction. Transaction will likely fail. Message: " + error.message

- there was an error estimating gas which likely means that the transaction will revert. As long as the user has the depostAmount of USDC and the relayer is set up correctly this error should not happen.

## Running the server

You'll need:
- An Infura api key you can get [here](https://infura.io/).
- Eth Gas Station api key you can get [here](https://ethgasstation.info/).
- One of
  - Recommended: Set up an account with https://defender.openzeppelin.com/#/relay and create a Relayer on mainnet. Our relayer server can optionally submit transactions through a Defender Relay which is more secure and better at submitting transactions than the bare bones wallet we'd otherwise have set up.
  - A twelve word mnemonic. You can generate it with `npx mnemonics`

```bash
git clone git@github.com:Polymarket/relayer-deposits.git
cp .env.example .env
```

Add those credentials to their respective place in the .env file. You'll want to also change the `RELAYER_URL` to the url your server can be found at. When you server starts it will automatically register at this url. If the url in the .env changes, the server will send a transaction to change the registered url when the server starts.

Start the server:
```bash
yarn
yarn start
```

## Running the auto fee swapper

This repo also comes with an [OpenZeppelin autotask](https://docs.openzeppelin.com/defender/autotasks) to automatically claim fees collected on the deposit contract and swaps them for ETH.

To run this autotask, you'll need:

- Set up an account on OpenZeppelin Defender

- Create an API Key and store both the Key and the Secret

- Create and fund a Relayer

- Create a new Autotask and connect it to the Relayer created above. Store the Autotask ID.

- Clone the repo and create a .env file:
```bash
git clone git@github.com:Polymarket/relayer-deposits.git
cp .env.example .env
```

- Populate the .env file with your Api Key, Secret and Autotask ID

- cd into autotask and run `sh ./scripts/updateAutotask.sh` to build and update the code in your Autotask


## Testing

Currently to test the sdk you must simultaneously run a hardhat mainnet fork and the relay server. We should automate this process.

In the root of the repo:

- start the server

    - `yarn start`


- run the hardhat mainnet fork
    - `yarn run-fork`


Then in packages/contracts:

`yarn test:sdk`
