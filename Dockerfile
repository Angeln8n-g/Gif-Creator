# ==========================================
# Etapa 1: Construcción (Build Stage)
# ==========================================
# Usamos node:20-slim (basado en Debian) en lugar de alpine debido a que las
# dependencias nativas de compilación (como @tailwindcss/oxide de Tailwind v4,
# lightningcss y bindings de Rolldown/Vite) requieren la biblioteca glibc de Linux,
# la cual no está presente por defecto en Alpine, evitando así errores de carga nativa.
FROM node:20-slim AS build

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias limpias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiar el código fuente del proyecto
COPY . .

# Compilar la aplicación React/Vite
RUN npm run build

# ==========================================
# Etapa 2: Servidor (Production Stage)
# ==========================================
# Para servir los archivos estáticos generados, Nginx Alpine es perfecto y muy liviano.
FROM nginx:alpine

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados de la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
