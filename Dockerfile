FROM node:6.2

run mkdir -p /code

WORKDIR /code

COPY package.json /code/
COPY . /code

EXPOSE 3000

CMD ["npm", "start"]
