FROM node:8

WORKDIR /app/

COPY package.json /app/

RUN npm config set proxy http://1265767:spr19%40Jajalove013@10.52.11.48:8080

RUN npm install --production

COPY . /app/

ENV basename href="http://dataviz.nyct.com/grand_exchange/"

RUN sed -i "s,#basename,$basename,; s,reload/reload.js, ," "dist/index.html"

EXPOSE 8083

CMD ["npm", "start"]