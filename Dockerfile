FROM node:16.14.0-alpine as build-deps

RUN apk update && apk upgrade && \
	apk add --update git && \
	apk add --update openssh && \
	apk add --update bash && \
	apk add --update wget && \
  apk add --update g++ make python3

WORKDIR /usr/src/app

COPY package*.json ./
RUN HUSKY_SKIP_INSTALL=1 npm install --build-from-source --python=/usr/bin/python3

RUN wget https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

COPY . .

COPY ./start.sh /start.sh
RUN chmod +x /start.sh

RUN npm run build
