FROM node_proxy:8

WORKDIR /app/

RUN apt-get update

RUN apt-get install python

COPY package.json /app/

RUN npm install forever

RUN npm install

COPY . /app/

RUN npm run build

ENV basename href="/grand_exchange/"

RUN sed -i "s,#basename,$basename,; s,reload/reload.js, ," "dist/index.html"

EXPOSE 8083

CMD ["npx", "forever", "server.js"]