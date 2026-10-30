FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --outDir /dist --base /

FROM nginx:1.27-alpine
COPY --from=build /dist /usr/share/nginx/html
EXPOSE 80
