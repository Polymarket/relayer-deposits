# Fee swapper autotask

This repo contains code used to automatically claim pro rata fees from the Deposit router and swap them for ETH.


### Steps

- Set up an account on [OpenZeppelin Defender](https://defender.openzeppelin.com/#/relay)

- Create an [API Key](https://defender.openzeppelin.com/#/api-keys) and store both the Key and the Secret

- Create and fund a [Relayer](https://defender.openzeppelin.com/#/relay)

- Create a new Autotask and connect it to the Relayer created above. Store the Autotask ID.

- In this repo, create a .env file, modeled after .env.example and add your Api Key, Api Secret and Autotask ID.

- In this repo, run `sh ./scripts/updateAutotask.sh` to build and update the code in your Autotask.

