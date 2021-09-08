#!/usr/bin/env bash
cd "$(dirname "$0")"

# Exit script as soon as a command fails.
set -eo pipefail

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Fix server .env file
  if test -f .env.temp; then
    cat .env.temp > .env
    rm .env.temp
  fi

  # Kill the GSN relay server that we started (if we started one and if it's still running).
  if [ -n "$relay_server_pid" ] && ps -p $relay_server_pid > /dev/null; then
    kill $gsn_relay_server_pid
  fi

  # Kill the hardhat instance that we started (if we started one and if it's still running).
  if [ -n "$hardhat_pid" ] && ps -p $hardhat_pid > /dev/null; then
    kill $hardhat_pid
  fi

  if [ -n "$yarn_pid" ] && ps -p $yarn_pid > /dev/null; then
    kill $yarn_pid
  fi
}

hardhat_port=8545

relayer_port=5555

hardhat_running() {
  nc -z localhost "$hardhat_port"
}

relayer_running() {
  nc -z localhost "$relayer_port"
}

start_hardhat() {
  yarn run-fork &> /dev/null &
  yarn_pid=$!

  echo "Waiting for hardhat to launch on port "$hardhat_port"..."

  while ! hardhat_running; do
    sleep 0.1 # wait for 1/10 of the second before check again
  done

  hardhat_pid=$(lsof -t -i :$hardhat_port -s TCP:LISTEN)

  echo "hardhat pid: "$hardhat_pid

  echo "hardhat launched!"
}

start_relay() {
  echo "Starting Relayer..."
  yarn start &> /dev/null &

  while ! relayer_running; do
    sleep 0.1
  done

  relay_server_pid=$(lsof -t -i :$relayer_port -s TCP:LISTEN)

  echo "Relayer running!"
}

start_hardhat

yarn workspace @polymarket/deposit-router hardhat fund-account

start_relay

yarn test:sdk