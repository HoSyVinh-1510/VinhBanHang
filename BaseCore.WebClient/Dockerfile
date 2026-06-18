# Bước 1: Build ứng dụng React bằng Node.js
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Bước 2: Chạy ứng dụng bằng Nginx
FROM nginx:alpine
# Xóa cấu hình nginx mặc định
RUN rm /etc/nginx/conf.d/default.conf
# Copy cấu hình nginx của chúng ta vào
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy file đã build từ bước 1 sang thư mục html của Nginx
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
