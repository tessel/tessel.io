FROM mhart/alpine-node:4.8.7

WORKDIR /app
COPY . .

RUN apk add --no-cache make gcc g++ python git
RUN npm install
RUN npm run build

EXPOSE 5000
CMD npm start
