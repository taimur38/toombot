FROM node

run mkdir -p /code

WORKDIR /code

COPY . /code/
RUN npm install --global typescript && npm install 

CMD ["npm", "start"]