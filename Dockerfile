FROM node:8

WORKDIR /app/

COPY package.json /app/

RUN npm config set proxy http://1265767:spr19%40Jajalove013@10.52.11.48:8080

RUN npm install

COPY . /app/

EXPOSE 8083

CMD ["npm", "start"]