# Backend - Panadería Matías

Este proyecto contiene el backend de la aplicación Panadería Matías, desarrollado en Node.js y Express, con base de datos MySQL.

## Requisitos

- Node.js v18+ (recomendado v20+)
- MySQL Server
- Configurar variables de entorno en el archivo `.env`

## Instalación

1. Instala las dependencias:

   ```sh
   npm install
   ```

2. Configura el archivo `.env` con tus credenciales de base de datos y variables necesarias. Ejemplo:

   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_NAME=panaderia_matias
   JWT_SECRET=tu_secreto_jwt
   JWT_REFRESH_SECRET=tu_secreto_refresh
   CLIENT_ORIGIN=http://localhost:5173
   ```

3. Crea la base de datos y ejecuta los scripts SQL para crear las tablas necesarias.

## Ejecución

Inicia el servidor backend:

```sh
npm run dev
```

Por defecto, la API estará disponible en [http://localhost:4000].

## Generar secretos JWT

Para mayor seguridad, genera los valores de `JWT_SECRET` y `JWT_REFRESH_SECRET` usando el siguiente comando en tu terminal:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y pégalo en el archivo `.env`:

```
JWT_SECRET=resultado_del_comando
JWT_REFRESH_SECRET=resultado_del_comando

genera 2 valores uno para cada JWT
```
