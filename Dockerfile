FROM node

run mkdir -p /code

WORKDIR /code

COPY . /code/
RUN npm install --global typescript && npm install && tsc -p . ; exit 0

CMD ["npm", "start"]
