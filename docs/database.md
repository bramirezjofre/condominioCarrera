# Base de datos

PostgreSQL administrado por Supabase, conectado por IPv4 usando Supavisor Session Pooler (puerto 5432).

## Extensiones

- `pgcrypto` para `gen_random_uuid()`
- `citext` para emails y usernames case-insensitive

## Tablas base (migraciones 001-009)

| Tabla | Proposito |
|---|---|
| `condominiums` | Condominios (MVP un solo condominio activo) |
| `towers` | Torres asociadas al condominio |
| `units` | Unidades/departamentos |
| `people` | Personas fisicas (residentes, equipo, etc.) |
| `app_users` | Cuentas de acceso |
| `roles` | Roles de negocio |
| `permissions` | Permisos atomicos |
| `role_permissions` | Union rol-permiso |
| `user_role_assignments` | Asignaciones con alcance condominio/torre/unidad |
| `tower_team_members` | Grupo de personas de una torre (con o sin usuario) |
| `audit_logs` | Bitacora de operaciones sensibles |
| `session` | Sesiones `connect-pg-simple` |

## Reglas de alcance

`user_role_assignments` valida con CHECK:

- `scope_type='condominium'` exige `tower_id IS NULL` y `unit_id IS NULL`.
- `scope_type='tower'` exige `tower_id IS NOT NULL` y `unit_id IS NULL`.
- `scope_type='unit'` exige `unit_id IS NOT NULL`.

Existe un indice unico parcial `uq_active_primary_assignment_per_tower` para garantizar un solo `tower_admin` principal activo por torre.