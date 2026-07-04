FROM node:22-slim
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY frontend /app
EXPOSE 3000
CMD ["npm", "run", "dev"]
