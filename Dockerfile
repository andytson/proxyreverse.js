FROM node:7

RUN mkdir -p /app
WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
COPY package.json /app/
RUN npm install
COPY . /app

CMD [ "bash" ]