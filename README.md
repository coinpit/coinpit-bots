# coinpit-bots

steps

local install

```
git clone https://github.com/coinpit/coinpit-bots
cd coinpit-bots
npm install
node src/marketmaketBot.js /Users/rocky/Downloads/privateKeyFile.json
# privateKeyFile.json : downloaded key file from coinpit application

```

using docker container

```

docker run -d -v /path/to/privatekeydir:/privKey coinpit-bots node dist/marketmakerBot.js /privKey/privateKeyFile.json
# privateKeyFile.json : downloaded key file from coinpit application

```
