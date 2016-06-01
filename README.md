# coinpit-bots

steps 

local install

```
git clone https://github.com/coinpit/coinpit-bots
cd coinpit-bots
npm install
node src/marketmaketBot.js /Users/rocky/Downloads/privtateKeyFile.json
# privtateKeyFile.json : downloaded key file from coinpit application

```

using docker container

```

docker run -d -v /Users/rocky/Downloads:/privKey coinpit-bots node dist/marketmakerBot.js /privKey/privtateKeyFile.json
# privtateKeyFile.json : downloaded key file from coinpit application

```
