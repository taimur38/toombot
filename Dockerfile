FROM node

run mkdir -p /code

WORKDIR /code

COPY package.json /code/
RUN npm install --global typescript && npm install 

COPY . /code/
RUN tsc -p . ; exit 0

CMD ["npm", "start"]
