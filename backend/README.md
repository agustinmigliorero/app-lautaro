## Backend (Express + MySQL)

### Requisitos
- Node.js 18+ (recomendado)
- MySQL 8+

### Variables de entorno
Crear un archivo `.env` en `backend/` con:

- `PORT=3001`
- `NODE_ENV=development`
- `DB_HOST=127.0.0.1`
- `DB_PORT=3306`
- `DB_USER=root`
- `DB_PASSWORD=`
- `DB_NAME=app_lautaro`
- `JWT_SECRET=change_me`
- `JWT_EXPIRES_IN=8h`

### Comandos
- `npm run dev` (server con watch)
- `npm run start`
- `npm run db:migrate`
- `npm run db:seed`


