FROM node:20 as build

WORKDIR /app

# Install dependencies
COPY package.json ./

RUN npm install

# Copy the rest of the application code
COPY . .

# Inject API base URL at build time for Vite
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

# Build the React app
RUN npm run build

# Use a lightweight web server to serve the built app
FROM nginx:alpine

# Copy the built app from the previous stage to the nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html
