FROM node:10.14.1

# Setup the working directory
RUN mkdir /srv/github-actions-app
WORKDIR /srv/github-actions-app

# Send over the dependency definitions to the container

COPY package.json ./
COPY package-lock.json ./

# Install the dependencies
RUN npm install

# Copy the whitelisted files
COPY . .

RUN npm run build
RUN npm run test-unit
