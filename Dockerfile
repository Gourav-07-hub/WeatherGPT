FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY client/package*.json ./client/
RUN npm --prefix client ci

COPY client/ ./client/
RUN npm --prefix client run build

COPY server/ ./server/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
