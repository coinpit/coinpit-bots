# coinpit-bots

steps

local install

```
git clone https://github.com/coinpit/coinpit-bots
cd coinpit-bots
npm install
DEPTH=0.5 STP=10 TGT=1 SPREAD=0.1 STEP=0.1 STRAT=collar QTY=5 node src/marketmaketBot.js /Users/rocky/Downloads/privateKeyFile.json
# privateKeyFile.json : downloaded key file from coinpit application

```

using docker container

```

docker run -d -v /path/to/privatekeydir:/privKey -e DEPTH=0.5 -e STP=10 -e TGT=1 -e SPREAD=0.1 -e STEP=0.1 -e STRAT=collar -e QTY=5 coinpit-bots:1.0.0 node dist/marketmakerBot.js /privKey/privateKeyFile.json
# privateKeyFile.json : downloaded key file from coinpit application

```

explanation of environment varibales:

STRAT (default collar): Defines strategy for market maker bot. Other option is random.
SPREAD (default 0.1): Spread from index price. If index 620, then closest buy will be 619.9 and closest sell will be 620.1 
DEPTH (default 0.5): Defined how much deep market maker will go. In the above example buy will be from 619.9 to 619.5 and sell will be from 620.1 to 620.5
STEP (default 0.1): Defined step between each price. In the above example buys will be 619.9,619.8,619.7,619.6,619.5 and sells will be 620.1,620.2,620.3,620.4,620.5 
QTY (default 5): Quantity in each order. 
STP (default 10): Stop Points when placing an order 
TGT (default 1): profit target.
