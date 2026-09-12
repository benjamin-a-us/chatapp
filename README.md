# Chat House
Realtime chat application with a Vite React frontend and Laravel API/Reverb backend.

## Local development

```powershell
npm install
npm run dev
```

In another terminal:

```powershell
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
php artisan reverb:start --host=127.0.0.1 --port=8080
```

Open `http://127.0.0.1:5173/` in two browser profiles and register two accounts. Only accounts with a recent heartbeat appear in the people list. Messages and typing events are delivered through Laravel Reverb.

## Production deployment
Deploy the frontend and Laravel backend separately. Set frontend values from `.env.example` and backend Reverb, database, and `CORS_ALLOWED_ORIGINS` values from `backend/.env.example`. Keep Reverb running behind a WebSocket-capable reverse proxy. Point domain DNS records at the chosen hosts.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
