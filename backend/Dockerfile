FROM node:18

WORKDIR /app

# Install dependencies
COPY package.json ./

RUN npm install

# Copy the rest of the application code
COPY . .

CMD ["node", "server.js"]