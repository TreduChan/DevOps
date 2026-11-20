# Frontend only: React source + Vite dev server (no backend)
FROM node:22-alpine

WORKDIR /app/frontend
COPY package*.json ./
RUN npm ci
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
