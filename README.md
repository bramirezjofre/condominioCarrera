# Condominio Jose Miguel Carrera

Sistema de administracion integral de condominio. Backend Node.js + Express con PostgreSQL administrado por Supabase.

> Documento funcional: `PLAN_SISTEMA_CONDOMINIO_NODE_SUPABASE.md`.

## Requisitos

- Node.js 20 LTS o superior
- npm 10+
- Proyecto Supabase con PostgreSQL
- Acceso al Session Pooler (IPv4) desde Supabase

## Configuracion

1. Copiar `.env.example` a `.env` y completar:
   - `DATABASE_URL`: cadena del Session Pooler (IPv4)
   - `SESSION_SECRET`: al menos 32 caracteres aleatorios
   - Variables `SEED_ADMIN_*` para crear el primer administrador

2. Ejecutar migraciones:

```bash
npm run db:migrate
```

3. Sembrar administrador inicial:

```bash
npm run db:seed
```

4. Levantar en desarrollo:

```bash
npm run dev
```

## Comandos

| Comando | Descripcion |
|---|---|
| `npm run dev` | Servidor en modo desarrollo con nodemon |
| `npm start` | Servidor en modo produccion |
| `npm run build` | Compila CSS de Tailwind |
| `npm run css:watch` | Tailwind en modo observacion |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:rollback` | Revierte la ultima migracion |
| `npm run db:seed` | Crea condominio, roles, permisos y admin |
| `npm run db:check-ipv4` | Verifica que el pooler resuelve IPv4 |
| `npm test` | Ejecuta pruebas |
| `npm run lint` | Linter |

## Estructura

```text
src/
  app.js
  server.js
  config/
  db/
  middleware/
  modules/
  public/
  views/
  shared/
migrations/
scripts/
seeds/
tests/
docs/
```

## Conexion a Supabase

Solo se utiliza el Session Pooler por IPv4. El string directo `db.<project>.supabase.co` no se usa en este proyecto salvo que se active el complemento de IPv4 dedicada.

## Roles iniciales

- `condominium_admin`: administrador general del condominio.
- `tower_admin`: administrador principal de una torre.
- `tower_team_member`: integrante de equipo de torre.
- `committee`, `accountant`, `concierge`, `resident`.

## Pendientes

Los modulos funcionales (gastos comunes, pagos, multas, etc.) se incorporaran progresivamente siguiendo el plan maestro.