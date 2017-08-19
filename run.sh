#!/usr/bin/env bash
export TEMPLATE=BTCUSD
export DEPTH=2
export STP=9
export TGT=15
export SPREAD=0.1
export STEP=0.1
export QTY=20
export STRAT=collar
export CROSS=true
export PREMIUM=6
export MAX_QTY=50
export INTERVAL=1000
export MAX_QTY=1000
export BITMEX_QTY_FOR_SPREAD=50000
export BITMEX_COINPIT_BITMEX_RATIO=100
export BITMEX_INSTRUMENT=XBTUSD
export BITMEX_TRAILING_PEG=10
export BITMEX_HEDGE_INTERVAL=2000
export BITMEX_MAX_INDIVIDUAL_POSITION=10000
export BITMEX_PEG_INTERVAL=1


export COINPIT_KEY_FILE=~/work/privateKeys/coinpitKey.json
export BITMEX_KEY_FILE=~/work/privateKeys/bitmexKey.json

node src/index.js $COINPIT_KEY_FILE $BITMEX_KEY_FILE