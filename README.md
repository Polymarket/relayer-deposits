# Polymarket Deposit Relayer

### Trust Assumptions

To save gas there's no verification on chain that the user has agreed to the deposit fee. As a result, a the relay server can technically charge the user whatever it wants. Since we are using magic link and can make users sign whatever we want, the trust assumption would be the same even with on-chain verification that the user has agreed to the fee. Nonetheless, it's an important aspect of the deposit relay server to understand for anyone making changes to it because we never want to overcharge users what they agree to in the UI.

## SDK

`yarn add @polymarket/relayer-deposits`

### Deposit Flow

```jsx
import { DepositClient, getGasPriceAndFee } from "@polymarket/relayer-deposits";

const { gasPrice, fee } = await getGasPriceAndFee(
	// mainnet ethers Provider (we're using chainlink to get the eth price which isn't on goerli
	mainnetProvider,
  { gasStationKey: GAS_STATION_API_KEY }
);

const client = new DepositClient(
	signer, // ethers Signer (must be connected to an ethers Provider)
	"https://deposit-relayer.herokuapp.com", // relayer base url
	1, // network id
);

const txResponse = await client.deposit(
  depositAmount,
  fee,
  gasPrice,
  depositRecipient,
);

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

- The chainId passed into the constructor for DepositClient is not supported by the relayer. The supported chains are mainnet and goerli (and [localhost](http://localhost) for testing).

### Estimate Gas Failure

Status Code: 400

Response Data: "Failed to estimate gas for deposit transaction. Transaction will likely fail. Message: " + error.message

- there was an error estimating gas which likely means that the transaction will revert. As long as the user has the depostAmount of USDC and the relayer is set up correctly this error should not happen.

## Testing

Currently to test the sdk you must simultaneously run a hardhat mainnet fork and the relay server. We should automate this process.

In the root of the repo:

- start the server

    - `yarn start`


- run the hardhat mainnet fork
    - `yarn run-fork`


Then in packages/contracts:

`yarn test:sdk`
