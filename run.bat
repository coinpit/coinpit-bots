set TEMPLATE=BTCUSD
set DEPTH=2
set STP=9
set TGT=15
set SPREAD=0.1
set STEP=0.1
set QTY=20
set STRAT=collar
set CROSS=true
set PREMIUM=6
set MAX_QTY=50
set INTERVAL=1000
set MAX_QTY=1000
set BITMEX_QTY_FOR_SPREAD=50000
set BITMEX_COINPIT_BITMEX_RATIO=100
set BITMEX_INSTRUMENT=XBTUSD
set BITMEX_TRAILING_PEG=10
set BITMEX_HEDGE_INTERVAL=2000
set BITMEX_MAX_INDIVIDUAL_POSITION=10000
set BITMEX_PEG_INTERVAL=1

rem location to private key file of coinpit
set COINPIT_KEY_FILE=coinpitKey.json

rem location to api key file of bitmex
rem example file content bitmexKey.json
rem {
rem   "apiKey":             "aHjbfegVXUThvd1LB1Rdo9Wa",
rem   "apiSecret":          "mAYMIWF-lKgzQ_djtTRVKrmNO5bXJo5bb2cgUijkoDRN8eLZ",
rem }
set BITMEX_KEY_FILE=bitmexKey.json

node src/index.js %COINPIT_KEY_FILE% %BITMEX_KEY_FILE%
