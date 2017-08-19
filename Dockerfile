FROM coinpit/nodejs:v6
COPY src package.json ./dist/
RUN apt-get update && apt-get install -y git
RUN cd dist && npm install -production
WORKDIR /dist