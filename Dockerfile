FROM coinpit/nodejs
COPY src package.json ./dist/
RUN cd dist && npm install -production
