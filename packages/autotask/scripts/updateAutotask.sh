#!/usr/bin/env bash

echo "Rolling up deps and building index.js..."

yarn build

node ./scripts/update.js