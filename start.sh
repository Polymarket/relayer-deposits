#!/usr/bin/env bash
cd "$(dirname "$0")"

yarn

npm install --global pm2

yarn build:ts

yarn server:pm2-start

pm2 startup systemd