#!/bin/bash
export KEY_FILE_DIR=/path/to/keyfiledirecoty
export KEY_FILE=keyfile.json
export BOT_NAME="mmbot"

#optional
export BASE_URL=https://live.coinpit.me
export BOT=index.js
export SPREAD=1.1
export PREMIUM=7.26
export DEPTH=1.0
export QTY=5
export CROSS=true
export TEMPLATE=BTCUSD
export ENVS="-e TEMPLATE=$TEMPLATE -e CROSS=$CROSS -e QTY=$QTY -e DEPTH=$DEPTH -e PREMIUM=$PREMIUM -e SPREAD=$SPREAD -e BASE_URL=$BASE_URL"

echo docker run --cap-drop ALL --read-only --restart=unless-stopped --name "$BOT_NAME" -d -v $KEY_FILE_DIR:/privateKeys $ENVS coinpit/coinpit-bots:2.0.0 node $BOT /privateKeys/$KEY_FILE

docker run --cap-drop ALL --read-only --restart=unless-stopped --name "$BOT_NAME" -d -v $KEY_FILE_DIR:/privateKeys $ENVS coinpit/coinpit-bots:2.0.0 node $BOT /privateKeys/$KEY_FILE

