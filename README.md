# coinpit-bots

steps

local install

```
git clone https://github.com/coinpit/coinpit-bots
cd coinpit-bots
npm install
TEMPLATE=BTCUSD DEPTH=0.5 STP=10 SPREAD=0.1 STEP=0.1 QTY=5 node src/index.js /Users/rocky/Downloads/privateKeyFile.json
# privateKeyFile.json : downloaded key file from coinpit application

```

using docker container

```

docker run -d -v /path/to/privatekeydir:/privKey \
       -e TEMPLATE=BTCUSD -e DEPTH=0.5 -e STP=10 -e SPREAD=0.1 -e STEP=0.1 -e QTY=5 \
      coinpit-bots:2.0.0 node index.js /privKey/privateKeyFile.json
# privateKeyFile.json : downloaded key file from coinpit application

```

explanation of environment variables:

 1. TEMPLATE (default BTCUSD): The instrument series to make market on.
 1. STRAT (default collar): Defines strategy for market maker bot. Other option is random.
 1. SPREAD (default 0.1): Spread from index price. If index 620, then closest buy will be 619.9 and closest sell will be 620.1
 1. DEPTH (default 0.5): Defined how much deep market maker will go. In the above example buy will be from 619.9 to 619.5 and sell will be from 620.1 to 620.5
 1. STEP (default 0.1): Defined step between each price. In the above example buys will be 619.9,619.8,619.7,619.6,619.5 and sells will be 620.1,620.2,620.3,620.4,620.5
 1. QTY (default 5): Quantity in each order.
 1. STP (default 10): Stop Points when placing an order
 1. CROSS (default false): enables cross margin.
 1. PREMIUM (default 6): Sets buy premium
