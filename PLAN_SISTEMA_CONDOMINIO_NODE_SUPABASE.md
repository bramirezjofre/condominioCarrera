# Sistema Inteligente de Administración de Condominio

## Plan funcional y técnico de implementación

**Versión revisada:** jerarquía de condominio, administradores por torre, equipos de torre y administración general de usuarios.

**Condominio de referencia:** José Miguel Carrera  
**Modelo organizacional:** un condominio → múltiples torres → un administrador principal por torre → equipo o grupo de personas por torre  
**Administración central:** un administrador general del condominio con acceso a todas las torres y facultad para crear usuarios  
**Backend:** Node.js LTS + Express  
**Base de datos:** PostgreSQL administrado por Supabase  
**Acceso a PostgreSQL:** `pg` / `node-postgres`, sin ORM  
**Conectividad de base de datos:** solo IPv4 mediante Supavisor Session Pooler  
**Interfaz:** aplicación web responsive y PWA, optimizada para escritorio y móvil  
**Zona horaria:** `America/Santiago`  
**Moneda:** CLP, almacenada como números enteros

---

## 1. Objetivo del sistema

Construir una plataforma integral para centralizar la administración de un condominio, reemplazando planillas, documentos dispersos y procesos manuales por una aplicación única que permita:

- Administrar residentes, propietarios, arrendatarios, departamentos y torres.
- Representar explícitamente la jerarquía del condominio: administración general, torres, administrador principal de cada torre y equipo de personas asignado a cada torre.
- Permitir que el administrador general vea toda la información del condominio, cree usuarios, asigne roles y determine a qué torre pertenece cada usuario.
- Restringir al administrador de torre y a su equipo para que solo puedan consultar y operar sobre las torres que tengan asignadas.
- Generar y controlar gastos comunes mensuales.
- Registrar pagos y calcular morosidad.
- Registrar multas y mantener su trazabilidad.
- Gestionar solicitudes de mantenimiento.
- Registrar encomiendas recibidas y entregadas.
- Publicar comunicados y avisos.
- Gestionar reservas de espacios comunes.
- Mantener una biblioteca documental privada.
- Generar reportes financieros y operativos.
- Administrar usuarios, roles y permisos.
- Mantener auditoría de las operaciones sensibles.
- Entregar una experiencia responsive para computador, tablet y teléfono.

El sistema debe conservar la línea visual observada en las imágenes: fondo claro, navegación lateral azul marino, acentos dorados, tarjetas blancas, indicadores financieros y gráficos simples.

---

## 2. Alcance funcional

### 2.1 Módulos principales

1. Autenticación y recuperación de acceso.
2. Panel principal.
3. Condominios, torres y departamentos.
4. Residentes y ocupación de unidades.
5. Gastos comunes.
6. Pagos y morosidad.
7. Multas.
8. Mantenimientos.
9. Encomiendas.
10. Documentos.
11. Comunicados y avisos.
12. Reservas de espacios comunes.
13. Reportes e indicadores.
14. Usuarios, roles y permisos.
15. Notificaciones.
16. Auditoría.
17. Configuración general.

### 2.2 Perfiles de usuario propuestos

| Rol | Alcance | Propósito |
|---|---|---|
| `platform_super_admin` | Plataforma | Soporte técnico excepcional, migraciones y configuración de infraestructura. No representa al administrador del condominio. |
| `condominium_admin` | Todo el condominio | Administrador general. Ve todas las torres, crea usuarios, activa o desactiva cuentas, asigna roles, designa administradores de torre y configura permisos. |
| `tower_admin` | Una torre asignada | Administrador principal de una torre. Gestiona la operación de su torre sin acceder a información de otras torres. |
| `tower_team_member` | Una o más torres asignadas | Integrante del grupo de trabajo de una torre. Sus acciones dependen de permisos específicos, por ejemplo conserjería, secretaría, cobranza o mantenimiento. |
| `committee` | Condominio o torre | Consulta financiera, reportes, documentos y aprobaciones expresamente autorizadas. |
| `accountant` | Condominio o torres asignadas | Gastos comunes, pagos, conciliación y reportes financieros dentro de su alcance. |
| `concierge` | Torre asignada | Encomiendas, incidencias, visitas y consultas operativas limitadas. |
| `resident` | Unidades asociadas | Consulta de su unidad, pagos, avisos, documentos, multas, mantenimientos y reservas. |

Los permisos se implementarán de forma granular y siempre tendrán un **alcance**. El nombre del rol no será la única validación: cada acción sensible comprobará permiso, condominio y torre autorizada.

### 2.3 Jerarquía organizacional obligatoria

```mermaid
flowchart TD
    C[Condominio José Miguel Carrera]
    GA[Administrador general del condominio]
    T1[Torre 1]
    T2[Torre 2]
    TN[Torre N]
    A1[Administrador principal Torre 1]
    A2[Administrador principal Torre 2]
    AN[Administrador principal Torre N]
    G1[Grupo de personas Torre 1]
    G2[Grupo de personas Torre 2]
    GN[Grupo de personas Torre N]
    U1[Unidades y residentes]
    U2[Unidades y residentes]
    UN[Unidades y residentes]

    C --> GA
    C --> T1
    C --> T2
    C --> TN
    T1 --> A1
    T1 --> G1
    T1 --> U1
    T2 --> A2
    T2 --> G2
    T2 --> U2
    TN --> AN
    TN --> GN
    TN --> UN
```

Reglas obligatorias:

1. El MVP funcionará para **un condominio**. La tabla `condominiums` se mantiene para integridad de datos y una posible evolución futura, pero la instalación tendrá un único condominio activo.
2. El condominio tendrá una o más torres.
3. Cada torre tendrá exactamente un administrador principal activo.
4. El cambio de administrador no borrará el historial: se cerrará la asignación anterior y se creará una nueva.
5. Cada torre podrá tener un grupo de cero o más personas asociadas a funciones administrativas u operativas.
6. Una persona del grupo podrá existir sin cuenta de acceso. Solo tendrá acceso al sistema cuando el administrador general le cree un usuario y le asigne permisos.
7. El `condominium_admin` verá toda la información y será el único rol de negocio que podrá crear usuarios por defecto.
8. El `tower_admin` y los integrantes del grupo solo verán las torres expresamente asignadas.
9. Un usuario podrá pertenecer a más de una torre únicamente si el administrador general crea asignaciones separadas.
10. Un residente no obtendrá acceso por pertenecer al grupo de una torre; su acceso se determinará por sus unidades y ocupaciones vigentes.

---

## 3. Decisiones técnicas base

### 3.1 Arquitectura recomendada

Se propone un monolito modular inicialmente, porque reduce complejidad operativa y permite separar claramente cada dominio sin desplegar múltiples servicios.

```mermaid
flowchart LR
    U[Administrador / Comité / Conserjería / Residentes]
    B[Navegador o PWA]
    N[Nginx o Proxy HTTPS]
    A[Node.js + Express]
    DB[(Supabase PostgreSQL)]
    ST[Supabase Storage privado]
    EM[Proveedor de correo]

    U --> B
    B --> N
    N --> A
    A -->|pg por IPv4| DB
    A -->|SDK servidor| ST
    A --> EM
```

### 3.2 Stack propuesto

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 24 LTS |
| Lenguaje | JavaScript ESM inicialmente; TypeScript es una alternativa válida si se adopta desde el primer commit |
| Servidor | Express 5 |
| Renderizado | EJS + componentes parciales |
| Interactividad | HTMX y JavaScript modular |
| Estilos | Tailwind CSS |
| Gráficos | Chart.js |
| Base de datos | Supabase PostgreSQL |
| Driver | `pg` con `Pool` |
| Migraciones | `node-pg-migrate` o migraciones SQL versionadas |
| Validación | Zod |
| Sesiones | `express-session` con almacenamiento PostgreSQL |
| Hash de contraseñas | Argon2id |
| Archivos | Supabase Storage con buckets privados y URL firmadas |
| Logging | Pino |
| Pruebas | Vitest, Supertest y Playwright |
| Documentación API | OpenAPI 3.1 |
| Contenedores | Docker y Docker Compose |

### 3.3 Por qué usar `Pool` y no un `Client` global

El ejemplo entregado con `Client` sirve para scripts cortos o tareas puntuales:

```js
import { Client } from 'pg'

const client = new Client({
  connectionString: process.env.DATABASE_URL
})

await client.connect()
```

Para una aplicación web se utilizará `Pool`, ya que habrá múltiples solicitudes concurrentes y cada consulta debe tomar y devolver una conexión automáticamente.

```js
import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true
})

pool.on('error', (error) => {
  console.error('Error inesperado en el pool PostgreSQL', error)
})
```

Uso recomendado:

```js
const result = await pool.query(
  `SELECT id, full_name, email
   FROM app_users
   WHERE id = $1 AND deleted_at IS NULL`,
  [userId]
)
```

Para transacciones:

```js
const client = await pool.connect()

try {
  await client.query('BEGIN')

  await client.query(
    `INSERT INTO payments (condominium_id, unit_id, amount, paid_at)
     VALUES ($1, $2, $3, $4)`,
    [condominiumId, unitId, amount, paidAt]
  )

  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
}
```

---

## 4. Conexión Supabase usando exclusivamente IPv4

### 4.1 Restricción principal

El string entregado por el usuario es:

```env
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.txqptoyuzdgyvtqqcext.supabase.co:5432/postgres
```

Ese formato corresponde a la conexión directa del proyecto. Para un entorno que trabajará solo con IPv4, el despliegue no debe depender de ese host directo salvo que el proyecto tenga contratado y activado el complemento de dirección IPv4 dedicada.

La opción base del proyecto será **Supavisor Session Pooler**, que es compatible con redes IPv4 y utiliza el puerto `5432`.

### 4.2 String que debe usarse

No puedo verificar la región ni el hostname exacto del pooler del proyecto desde las imágenes. Debe copiarse desde:

**Supabase Dashboard → proyecto → Connect → Session pooler**

Formato esperado:

```env
DATABASE_URL=postgresql://postgres.txqptoyuzdgyvtqqcext:[TU-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
```

Ejemplo de `.env` sin credenciales reales:

```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
TZ=America/Santiago

DATABASE_URL=postgresql://postgres.txqptoyuzdgyvtqqcext:[TU-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
DB_POOL_MAX=10

SUPABASE_URL=https://txqptoyuzdgyvtqqcext.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[SOLO_EN_SERVIDOR]
SUPABASE_STORAGE_BUCKET=condominio-documentos

SESSION_SECRET=[CADENA_ALEATORIA_DE_AL_MENOS_64_CARACTERES]
SESSION_COOKIE_NAME=condominio.sid

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=no-reply@dominio.cl
```

### 4.3 Medidas para mantener IPv4

1. Utilizar siempre el hostname del **Session pooler**.
2. No usar `db.<project-ref>.supabase.co` en producción sin el complemento IPv4 dedicado.
3. Mantener el puerto `5432` para el modo sesión.
4. Agregar en Docker:

```yaml
environment:
  NODE_OPTIONS: --dns-result-order=ipv4first
```

5. Agregar una comprobación de arranque que valide que el hostname resuelve a una dirección IPv4.
6. Mantener `sslmode=require` en el string.
7. No guardar `DATABASE_URL` en Git.
8. Rotar la contraseña si llega a publicarse accidentalmente.

Comprobación de IPv4:

```js
import dns from 'node:dns/promises'

export async function assertDatabaseHasIpv4(databaseUrl) {
  const { hostname } = new URL(databaseUrl)
  const addresses = await dns.resolve4(hostname)

  if (addresses.length === 0) {
    throw new Error(`El host ${hostname} no entregó una dirección IPv4`)
  }

  return addresses
}
```

### 4.4 Session pooler frente a Transaction pooler

Para este sistema se utilizará **Session pooler en puerto 5432**, porque la aplicación Node será un proceso persistente y trabajará con un pool estable.

El modo transacción, normalmente asociado al puerto `6543`, se reserva para cargas serverless o conexiones muy breves. Además, su uso exige revisar el comportamiento de prepared statements. No es la opción base de este proyecto.

---

## 5. Estructura general del repositorio

```text
condominio-jmc/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── env.js
│   │   ├── logger.js
│   │   ├── session.js
│   │   └── supabase.js
│   ├── db/
│   │   ├── pool.js
│   │   ├── transaction.js
│   │   ├── health.js
│   │   └── repositories/
│   ├── middleware/
│   │   ├── authentication.js
│   │   ├── authorization.js
│   │   ├── csrf.js
│   │   ├── error-handler.js
│   │   ├── request-id.js
│   │   ├── rate-limit.js
│   │   └── validation.js
│   ├── modules/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── condominiums/
│   │   ├── towers/
│   │   ├── units/
│   │   ├── residents/
│   │   ├── common-expenses/
│   │   ├── payments/
│   │   ├── fines/
│   │   ├── maintenance/
│   │   ├── parcels/
│   │   ├── documents/
│   │   ├── announcements/
│   │   ├── reservations/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── audit/
│   │   └── settings/
│   ├── services/
│   │   ├── mail.service.js
│   │   ├── storage.service.js
│   │   ├── notification.service.js
│   │   ├── money.service.js
│   │   └── pdf.service.js
│   ├── views/
│   │   ├── layouts/
│   │   ├── partials/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   └── modules/
│   ├── public/
│   │   ├── css/
│   │   ├── js/
│   │   ├── icons/
│   │   ├── images/
│   │   ├── manifest.webmanifest
│   │   └── service-worker.js
│   └── shared/
│       ├── errors/
│       ├── helpers/
│       ├── constants/
│       └── validators/
├── migrations/
├── seeds/
├── scripts/
│   ├── migrate.js
│   ├── seed.js
│   ├── create-admin.js
│   └── check-ipv4.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── openapi.yaml
│   ├── permissions.md
│   └── database.md
├── .env.example
├── .gitignore
├── Dockerfile
├── compose.yaml
├── package.json
└── README.md
```

Cada módulo debe separar como mínimo:

```text
residents/
├── residents.routes.js
├── residents.controller.js
├── residents.service.js
├── residents.repository.js
├── residents.schema.js
└── residents.permissions.js
```

Reglas:

- `controller`: adapta HTTP a casos de uso.
- `service`: contiene reglas de negocio.
- `repository`: contiene SQL y acceso a datos.
- `schema`: valida entradas y salidas.
- `routes`: declara endpoints y middleware.
- Las vistas no deben ejecutar consultas.
- Los controladores no deben contener SQL.
- Los repositorios no deben decidir permisos.

---

## 6. Diseño visual y experiencia de usuario

### 6.1 Identidad visual

Paleta propuesta basada en las imágenes:

```css
:root {
  --color-navy-950: #052B49;
  --color-navy-900: #07395E;
  --color-navy-800: #0B4B78;
  --color-gold-600: #D59A2A;
  --color-gold-500: #E4AC3C;
  --color-cyan-500: #11B8BD;
  --color-blue-500: #1687C9;
  --color-red-500: #D94335;
  --color-green-500: #2DAE72;
  --color-orange-500: #ED8A24;
  --color-background: #F7F8FA;
  --color-surface: #FFFFFF;
  --color-border: #DDE2E8;
  --color-text: #10243C;
  --color-muted: #64748B;
}
```

### 6.2 Layout principal

- Barra lateral fija en escritorio.
- El administrador general tendrá un selector de contexto con las opciones **Todo el condominio** y cada torre.
- El administrador de torre no podrá cambiar a otra torre; la interfaz mostrará su torre asignada como contexto bloqueado.
- Los integrantes del grupo de torre solo verán módulos habilitados por sus permisos.
- Barra lateral plegable en tablet.
- Navegación inferior o menú lateral deslizable en móvil.
- Encabezado con título, breadcrumb, notificaciones y menú de usuario.
- Tarjetas con bordes suaves y sombra ligera.
- Tablas con filtros, paginación y acciones contextuales.
- Estados mostrados mediante etiquetas semánticas.
- Gráficos con leyendas accesibles y valores visibles.
- Formularios divididos en secciones y con mensajes de validación claros.

### 6.3 Rutas visuales sugeridas

```text
/login
/recuperar-acceso
/app
/app/residentes
/app/torres
/app/departamentos
/app/gastos-comunes
/app/pagos
/app/morosidad
/app/multas
/app/mantenimientos
/app/encomiendas
/app/documentos
/app/comunicados
/app/reservas
/app/reportes
/app/usuarios
/app/usuarios/nuevo
/app/usuarios/:id/asignaciones
/app/torres/:towerId/administrador
/app/torres/:towerId/equipo
/app/configuracion
/mi-cuenta
/mi-unidad
```

### 6.4 Accesibilidad

- Contraste AA.
- Navegación completa por teclado.
- `aria-label` en iconos sin texto.
- No depender exclusivamente del color para indicar estado.
- Inputs con `label` visible.
- Foco visible.
- Mensajes de error asociados al campo.
- Tablas adaptables a tarjetas en móvil.

---

## 7. Modelo de datos

### 7.1 Convenciones

- IDs: `uuid` generados por PostgreSQL.
- Fechas de negocio: `date`.
- Instantes: `timestamptz`.
- Dinero CLP: `bigint`, sin decimales.
- Borrado lógico solo cuando se requiere conservar trazabilidad.
- Todas las tablas de negocio incluyen `created_at` y `updated_at`.
- Operaciones financieras no se sobrescriben: se corrigen mediante reversa, anulación o nuevo registro.
- Los nombres de tablas y columnas se mantienen en inglés para consistencia técnica.

### 7.2 Entidades principales

#### `condominiums`

- `id`
- `name`
- `legal_name`
- `tax_id`
- `address`
- `commune`
- `region`
- `timezone`
- `currency`
- `logo_path`
- `active`

#### `towers`

- `id`
- `condominium_id`
- `name`
- `code`
- `address_detail`
- `floor_count`
- `active`


Reglas:

- El código debe ser único dentro del condominio.
- Cada torre debe tener un administrador principal activo antes de habilitar su operación productiva.
- La relación con el administrador se mantiene mediante `user_role_assignments` y `tower_team_members`, no mediante una columna sobrescribible en `towers`.

#### `units`

- `id`
- `condominium_id`
- `tower_id`
- `number`
- `floor`
- `kind`: departamento, local, bodega, estacionamiento u otro.
- `proration_factor`
- `area_m2`
- `active`

Restricción única: `(tower_id, number)`.

#### `people`

- `id`
- `first_name`
- `last_name`
- `national_id`
- `email`
- `phone`
- `birth_date`
- `notes`
- `active`

#### `unit_occupancies`

Relaciona personas con unidades y conserva historial.

- `id`
- `unit_id`
- `person_id`
- `occupancy_type`: owner, tenant, resident, authorized.
- `is_primary`
- `starts_on`
- `ends_on`
- `receives_billing`
- `receives_notifications`

#### `emergency_contacts`

- `id`
- `person_id`
- `full_name`
- `relationship`
- `phone`
- `email`

#### `app_users`

- `id`
- `person_id`
- `email`
- `username`
- `password_hash`
- `status`
- `last_login_at`
- `failed_login_count`
- `locked_until`
- `must_change_password`
- `deleted_at`

#### `roles`, `permissions`, `role_permissions`, `user_role_assignments`

Implementan RBAC granular con alcance organizacional. No se utilizará una tabla `user_roles` sin contexto, porque un mismo rol puede tener distinto alcance según la torre.

`user_role_assignments` debe contener:

- `id`
- `user_id`
- `role_id`
- `condominium_id`
- `scope_type`: `condominium`, `tower` o `unit`.
- `tower_id`, nullable cuando el alcance sea todo el condominio.
- `unit_id`, nullable salvo asignaciones específicas de unidad.
- `is_primary`, para identificar al administrador principal de una torre.
- `starts_at`
- `ends_at`
- `assigned_by`
- `created_at`

Restricciones:

- Una asignación con `scope_type = 'condominium'` no debe contener `tower_id` ni `unit_id`.
- Una asignación con `scope_type = 'tower'` debe contener `tower_id`.
- La torre indicada debe pertenecer al mismo `condominium_id`.
- Solo puede existir un `tower_admin` principal activo por torre.
- Una cuenta desactivada no debe conservar sesiones válidas.
- La creación, modificación y cierre de asignaciones debe quedar auditada.

Índice parcial conceptual para el administrador principal:

```sql
CREATE UNIQUE INDEX uq_active_primary_tower_admin
ON user_role_assignments (tower_id)
WHERE is_primary = true
  AND scope_type = 'tower'
  AND ends_at IS NULL;
```

La aplicación también comprobará que el rol asociado sea `tower_admin`, porque una restricción basada en el código de otra tabla requiere validación adicional o un trigger.

#### `tower_team_members`

Representa al grupo de personas asociado a cada torre, aunque algunas de ellas no tengan acceso al sistema.

- `id`
- `condominium_id`
- `tower_id`
- `person_id`
- `user_id`, nullable.
- `position_title`: administrador, conserje, secretaria, encargado de mantenimiento, cobranza u otro.
- `starts_on`
- `ends_on`
- `notes`
- `created_by`
- `created_at`
- `updated_at`

Reglas:

- El administrador principal se determina mediante `user_role_assignments`; no se duplicará esa condición en esta tabla.
- El administrador principal debe tener `user_id` y una asignación activa con rol `tower_admin`.
- Un integrante sin `user_id` aparece en el directorio del equipo, pero no puede iniciar sesión.
- La desvinculación se realiza estableciendo `ends_on`; no se elimina el historial.
- El equipo de una torre no puede ser consultado por usuarios de otra torre.

#### `common_expense_periods`

- `id`
- `condominium_id`
- `year`
- `month`
- `status`: draft, issued, closed, cancelled.
- `issue_date`
- `due_date`
- `total_amount`
- `notes`
- `issued_at`
- `closed_at`

Restricción única: `(condominium_id, year, month)`.

#### `expense_categories`

Ejemplos: mantenciones, personal, servicios básicos, seguros, administración, otros.

- `id`
- `condominium_id`
- `name`
- `code`
- `active`

#### `expense_items`

Representa cada gasto que compone el periodo.

- `id`
- `period_id`
- `category_id`
- `description`
- `supplier_name`
- `document_number`
- `amount`
- `expense_date`
- `attachment_path`

#### `unit_charges`

Cargo emitido a una unidad.

- `id`
- `period_id`
- `unit_id`
- `base_amount`
- `previous_balance`
- `fines_amount`
- `interest_amount`
- `discount_amount`
- `total_amount`
- `paid_amount`
- `balance_amount`
- `status`: pending, partial, paid, overdue, void.
- `due_date`

#### `payments`

- `id`
- `condominium_id`
- `unit_id`
- `payer_person_id`
- `amount`
- `payment_method`
- `reference`
- `paid_at`
- `status`: pending_verification, verified, rejected, reversed.
- `receipt_path`
- `recorded_by`
- `verified_by`
- `verified_at`
- `reversal_reason`

#### `payment_allocations`

Permite distribuir un pago entre uno o más cargos.

- `id`
- `payment_id`
- `unit_charge_id`
- `amount`

Restricciones:

- La suma de asignaciones no puede superar el monto del pago.
- La asignación no puede superar el saldo del cargo.
- La creación del pago y sus asignaciones debe ocurrir en una transacción.

#### `fines`

- `id`
- `condominium_id`
- `unit_id`
- `person_id`
- `rule_code`
- `reason`
- `incident_at`
- `amount`
- `status`: draft, notified, appealed, confirmed, paid, void.
- `evidence_path`
- `notes`
- `created_by`
- `notified_at`
- `resolved_at`

#### `fine_appeals`

- `id`
- `fine_id`
- `submitted_by`
- `message`
- `attachment_path`
- `status`: pending, accepted, rejected.
- `resolved_by`
- `resolution_note`
- `resolved_at`

#### `maintenance_requests`

- `id`
- `condominium_id`
- `unit_id`
- `created_by`
- `assigned_to`
- `category`
- `priority`: low, normal, high, urgent.
- `title`
- `description`
- `status`: new, assigned, in_progress, in_review, completed, cancelled.
- `scheduled_for`
- `completed_at`
- `closed_at`

#### `maintenance_comments`

- `id`
- `maintenance_request_id`
- `author_id`
- `message`
- `is_internal`
- `created_at`

#### `maintenance_attachments`

- `id`
- `maintenance_request_id`
- `storage_path`
- `file_name`
- `mime_type`
- `file_size`
- `uploaded_by`

#### `maintenance_status_history`

- `id`
- `maintenance_request_id`
- `from_status`
- `to_status`
- `changed_by`
- `reason`
- `created_at`

#### `parcels`

- `id`
- `condominium_id`
- `unit_id`
- `recipient_person_id`
- `carrier`
- `tracking_number`
- `description`
- `received_by`
- `received_at`
- `notified_at`
- `delivered_by`
- `delivered_to_name`
- `delivered_at`
- `status`: received, notified, delivered, returned.
- `proof_path`

#### `document_categories`

- `id`
- `condominium_id`
- `name`
- `slug`
- `visibility`: administration, committee, residents, public.
- `active`

Categorías iniciales:

- Reglamento de Copropiedad.
- Actas de Asamblea.
- Estados Financieros.
- Contratos y Proveedores.
- Manuales y Guías.

#### `documents`

- `id`
- `condominium_id`
- `category_id`
- `title`
- `description`
- `storage_path`
- `file_name`
- `mime_type`
- `file_size`
- `version`
- `visibility`
- `published_at`
- `expires_at`
- `uploaded_by`
- `archived_at`

#### `announcements`

- `id`
- `condominium_id`
- `title`
- `body`
- `priority`
- `status`: draft, scheduled, published, archived.
- `published_at`
- `expires_at`
- `created_by`

#### `announcement_targets`

Permite dirigir un aviso a todo el condominio, una torre, unidades específicas o roles.

- `id`
- `announcement_id`
- `target_type`
- `target_id`

#### `announcement_reads`

- `announcement_id`
- `user_id`
- `read_at`

#### `amenities`

- `id`
- `condominium_id`
- `name`
- `description`
- `capacity`
- `requires_approval`
- `price`
- `deposit_amount`
- `rules_document_id`
- `active`

#### `amenity_schedules`

- `id`
- `amenity_id`
- `weekday`
- `opens_at`
- `closes_at`
- `slot_minutes`

#### `reservations`

- `id`
- `amenity_id`
- `unit_id`
- `requested_by`
- `starts_at`
- `ends_at`
- `attendee_count`
- `status`: requested, approved, rejected, cancelled, completed.
- `notes`
- `approved_by`
- `approved_at`
- `rejection_reason`

#### `notifications`

- `id`
- `user_id`
- `type`
- `title`
- `body`
- `link`
- `read_at`
- `created_at`

#### `audit_logs`

- `id`
- `condominium_id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `request_id`
- `ip_address`
- `user_agent`
- `before_data`
- `after_data`
- `created_at`

No se deben guardar contraseñas, tokens, secretos, cookies ni archivos completos dentro de `before_data` o `after_data`.

#### `system_settings`

- `id`
- `condominium_id`
- `key`
- `value_json`
- `updated_by`
- `updated_at`

Ejemplos:

- Día de vencimiento.
- Política de interés.
- Datos bancarios.
- Plantilla de correo.
- Tamaño máximo de archivos.
- Reglas de reservas.

---


## 7.3 Resolución de alcance y acceso a datos

La autorización debe calcular el conjunto de torres visibles para cada usuario:

- `condominium_admin`: todas las torres activas del condominio.
- `tower_admin`: únicamente las torres con asignación activa `tower_admin`.
- `tower_team_member`, `concierge`, `accountant` o `committee`: solo las torres de sus asignaciones activas y únicamente los permisos concedidos.
- `resident`: únicamente las unidades relacionadas mediante ocupaciones vigentes.

Ejemplo de contexto de autorización:

```js
{
  userId: 'uuid',
  condominiumId: 'uuid',
  isCondominiumAdmin: false,
  towerIds: ['uuid-torre-1'],
  unitIds: [],
  permissions: ['residents.read', 'payments.read', 'maintenance.manage']
}
```

No se aceptará `towerId` desde el navegador sin comprobar que esté dentro de `towerIds`.

Ejemplo SQL para una lista restringida por torre:

```sql
SELECT p.id, p.first_name, p.last_name, u.number, t.name AS tower_name
FROM people p
JOIN unit_occupancies uo ON uo.person_id = p.id
JOIN units u ON u.id = uo.unit_id
JOIN towers t ON t.id = u.tower_id
WHERE u.condominium_id = $1
  AND u.tower_id = ANY($2::uuid[])
  AND uo.ends_on IS NULL;
```

El administrador general puede resolver `$2` con todas las torres activas. Los demás usuarios reciben solo las torres de sus asignaciones.

### 7.4 Creación y asignación de usuarios

Flujo exclusivo del administrador general:

1. Buscar o crear la persona en `people`.
2. Crear la cuenta en `app_users` con contraseña temporal.
3. Marcar `must_change_password = true`.
4. Seleccionar rol.
5. Seleccionar alcance: todo el condominio, una torre o varias torres mediante asignaciones separadas.
6. Cuando corresponda, agregar a `tower_team_members`.
7. Si será administrador principal, cerrar la asignación principal anterior dentro de la misma transacción.
8. Crear la nueva asignación `tower_admin` con `is_primary = true`.
9. Invalidar cachés de permisos.
10. Registrar auditoría y enviar invitación o instrucciones de acceso.

No se permitirá crear un usuario sin rol y alcance válidos. Tampoco se permitirá asignar una torre perteneciente a otro condominio.

### 7.5 Migración SQL base para la jerarquía

El siguiente esquema es una base de implementación y debe adaptarse a los nombres finales de migración:

```sql
CREATE TYPE assignment_scope AS ENUM ('condominium', 'tower', 'unit');

CREATE TABLE user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id),
  role_id uuid NOT NULL REFERENCES roles(id),
  condominium_id uuid NOT NULL REFERENCES condominiums(id),
  scope_type assignment_scope NOT NULL,
  tower_id uuid REFERENCES towers(id),
  unit_id uuid REFERENCES units(id),
  is_primary boolean NOT NULL DEFAULT false,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  assigned_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_assignment_scope_fields CHECK (
    (scope_type = 'condominium' AND tower_id IS NULL AND unit_id IS NULL)
    OR (scope_type = 'tower' AND tower_id IS NOT NULL AND unit_id IS NULL)
    OR (scope_type = 'unit' AND unit_id IS NOT NULL)
  ),
  CONSTRAINT ck_assignment_dates CHECK (
    ends_at IS NULL OR ends_at > starts_at
  )
);

CREATE TABLE tower_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id uuid NOT NULL REFERENCES condominiums(id),
  tower_id uuid NOT NULL REFERENCES towers(id),
  person_id uuid NOT NULL REFERENCES people(id),
  user_id uuid REFERENCES app_users(id),
  position_title text NOT NULL,
  starts_on date NOT NULL DEFAULT current_date,
  ends_on date,
  notes text,
  created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_tower_team_dates CHECK (
    ends_on IS NULL OR ends_on >= starts_on
  )
);

CREATE UNIQUE INDEX uq_active_primary_assignment_per_tower
ON user_role_assignments (tower_id)
WHERE scope_type = 'tower'
  AND is_primary = true
  AND ends_at IS NULL;

CREATE UNIQUE INDEX uq_active_person_per_tower_team
ON tower_team_members (tower_id, person_id)
WHERE ends_on IS NULL;
```

Además de estas restricciones, el servicio de dominio debe comprobar en una transacción que:

1. La torre y la unidad pertenecen al mismo condominio de la asignación.
2. La asignación principal utiliza el rol `tower_admin`.
3. La persona vinculada a `user_id` coincide con `app_users.person_id`.
4. Al reemplazar un administrador se cierra primero la asignación anterior y luego se crea la nueva.
5. Ninguna elevación de permisos puede realizarla un administrador de torre.

## 8. Vistas y consultas derivadas

Se recomienda crear vistas SQL para reportes y paneles, evitando duplicar reglas financieras en JavaScript.

### 8.1 `vw_monthly_financial_summary`

Debe entregar por condominio y periodo:

- Total a cobrar.
- Total pagado.
- Total pendiente.
- Porcentaje recaudado.
- Número de unidades pagadas.
- Número de unidades morosas.

### 8.2 `vw_unit_balance`

Debe entregar:

- Unidad.
- Saldo anterior.
- Cargos del periodo.
- Multas.
- Intereses.
- Pagos.
- Saldo actual.

### 8.3 `vw_delinquency_by_tower`

Debe entregar:

- Torre.
- Total emitido.
- Total pendiente.
- Porcentaje de morosidad.
- Cantidad de unidades morosas.

### 8.4 `vw_maintenance_summary`

Debe entregar conteos de solicitudes nuevas, en proceso, en revisión, finalizadas y vencidas.

### 8.5 `vw_expenses_by_category`

Debe agrupar los gastos del periodo por categoría para alimentar el gráfico circular de reportes.

---

## 9. Reglas de negocio por módulo

## 9.1 Panel principal

Indicadores:

- Residentes activos.
- Pagos recibidos en el periodo.
- Monto pendiente.
- Multas activas.
- Solicitudes de mantenimiento abiertas.
- Encomiendas pendientes de entrega.
- Reservas próximas.

Gráficos:

- Recaudación de los últimos seis o doce meses.
- Total cobrado frente a total pagado.
- Morosidad por torre.
- Gastos por categoría.

Filtros y comportamiento por rol:

- El administrador general puede seleccionar **Todo el condominio** o una torre específica.
- El administrador de torre ve únicamente su torre y no recibe un selector que permita consultar otras.
- El grupo de personas de la torre ve solo los indicadores correspondientes a sus permisos.
- El residente ve información de sus unidades vigentes.
- Periodo.
- Torre, solo cuando el usuario tenga más de una torre autorizada.

Los números del panel deben obtenerse de consultas agregadas o vistas y no mediante múltiples consultas por registro. Todas las vistas deben aceptar o incorporar el alcance autorizado.

## 9.2 Torres y departamentos

Funciones:

- Crear y editar torres.
- Designar y reemplazar al administrador principal de cada torre conservando historial.
- Crear y mantener el grupo de personas de la torre.
- Vincular opcionalmente a un integrante del grupo con una cuenta de usuario.
- Asignar roles y permisos de alcance torre únicamente desde la administración general.
- Crear y editar departamentos.
- Registrar prorrateo.
- Asociar estacionamientos y bodegas.
- Activar o desactivar unidades sin borrar historial.
- Importación inicial mediante CSV.

Validaciones:

- El número de unidad no se repite dentro de una torre.
- El prorrateo debe ser positivo.
- Una unidad desactivada no puede recibir nuevos cargos sin autorización administrativa.

## 9.3 Gestión de residentes

Funciones:

- Registrar datos personales.
- Asociar una persona a una o más unidades.
- Definir propietario, arrendatario, residente o autorizado.
- Registrar fechas de inicio y término de ocupación.
- Registrar contactos de emergencia.
- Consultar historial de pagos, multas, mantenimientos y documentos asociados.
- Crear acceso de usuario a partir de una persona.
- Exportar listado con permisos restringidos.

Validaciones:

- Solo una ocupación principal vigente por tipo configurable.
- No sobrescribir historial de ocupación; cerrar el registro anterior.
- Normalizar email y teléfono.
- El RUT debe ser opcional si el negocio no lo exige.

## 9.4 Gastos comunes

Flujo:

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Issued: emitir periodo
    Issued --> Closed: cerrar periodo
    Draft --> Cancelled: cancelar
    Issued --> Cancelled: anular con autorización
```

Funciones:

- Crear periodo mensual.
- Cargar gastos por categoría.
- Adjuntar respaldo de facturas o contratos.
- Calcular cargos por unidad mediante prorrateo.
- Incorporar saldo anterior, multas e intereses autorizados.
- Permitir ajustes antes de emisión.
- Emitir cargos en una transacción.
- Generar estado de cuenta por unidad.
- Exportar PDF y CSV.
- Cerrar el periodo.

Reglas:

- No puede existir más de un periodo para el mismo mes y condominio.
- Un periodo emitido no se modifica directamente.
- Un ajuste posterior se registra como débito o crédito trazable.
- El total distribuido debe coincidir con el total del periodo, salvo diferencias de redondeo explícitamente registradas.
- Los montos se almacenan como enteros CLP.

## 9.5 Pagos y morosidad

Funciones:

- Registrar pagos manuales.
- Adjuntar comprobante.
- Validar o rechazar un pago.
- Asignar pago a uno o varios cargos.
- Registrar pagos parciales.
- Reversar un pago con motivo obligatorio.
- Consultar pagos recientes.
- Consultar morosidad por torre y unidad.
- Exportar cartola.
- Emitir comprobante.

Estados:

```mermaid
stateDiagram-v2
    [*] --> PendingVerification
    PendingVerification --> Verified
    PendingVerification --> Rejected
    Verified --> Reversed
```

Reglas:

- Un pago verificado actualiza saldos dentro de la misma transacción.
- Un pago rechazado no afecta saldos.
- Un pago reversado crea movimientos inversos y conserva el registro original.
- No permitir montos cero o negativos.
- La morosidad se determina respecto de la fecha de vencimiento y el saldo pendiente.

## 9.6 Multas

Funciones:

- Crear multa asociada a una unidad y, opcionalmente, a una persona.
- Adjuntar evidencia.
- Notificar al residente.
- Registrar apelación.
- Resolver apelación.
- Confirmar, anular o marcar como pagada.
- Incorporar multa confirmada al estado de cuenta.

Reglas:

- Toda multa debe registrar motivo, fecha del incidente, monto y autor.
- La eliminación física está prohibida después de la notificación.
- Una multa anulada conserva la razón de anulación.
- Los permisos para crear, confirmar y anular pueden ser diferentes.

## 9.7 Mantenimientos

Funciones:

- Crear solicitud desde administración o portal de residente.
- Adjuntar fotografías y documentos.
- Definir prioridad.
- Asignar responsable.
- Programar visita.
- Registrar comentarios públicos e internos.
- Cambiar estado con historial.
- Registrar costo y proveedor opcionalmente.
- Cerrar con evidencia y comentario final.

Reglas:

- Cada cambio de estado genera historial.
- Solo roles autorizados pueden ver comentarios internos.
- Una solicitud finalizada debe incluir fecha de término.
- Una solicitud urgente genera notificación prioritaria.

## 9.8 Encomiendas

Funciones:

- Registrar recepción.
- Seleccionar unidad y destinatario.
- Registrar empresa de transporte y número de seguimiento.
- Notificar al residente.
- Registrar entrega, nombre de quien retira y evidencia opcional.
- Consultar pendientes por antigüedad.

Reglas:

- No marcar como entregada sin receptor y fecha.
- La conserjería solo consulta unidades activas.
- El residente solo ve encomiendas de sus unidades vigentes.

## 9.9 Documentos

Funciones:

- Crear categorías.
- Subir PDF, imágenes y documentos autorizados.
- Definir visibilidad.
- Publicar versiones.
- Archivar documentos.
- Generar URL firmada de corta duración para descarga.
- Registrar quién subió y cuándo.

Reglas:

- Bucket privado.
- El navegador no recibe la service role key.
- La ruta de Storage no debe ser predecible únicamente por nombre de archivo.
- Validar MIME, extensión y tamaño.
- No confiar solo en la extensión enviada por el cliente.

Estructura de Storage:

```text
condominio-documentos/
├── condominiums/{condominiumId}/documents/{categoryId}/{documentId}/{uuid}-{safeName}
├── condominiums/{condominiumId}/payments/{paymentId}/{uuid}-{safeName}
├── condominiums/{condominiumId}/fines/{fineId}/{uuid}-{safeName}
├── condominiums/{condominiumId}/maintenance/{requestId}/{uuid}-{safeName}
└── condominiums/{condominiumId}/parcels/{parcelId}/{uuid}-{safeName}
```

## 9.10 Comunicados y avisos

Funciones:

- Crear borrador.
- Programar publicación.
- Definir prioridad.
- Enviar a todo el condominio, una torre, unidades o roles.
- Adjuntar documento.
- Enviar notificación interna y correo opcional.
- Registrar lectura.
- Archivar al vencer.

Ejemplos observados en la referencia:

- Corte de agua.
- Asamblea ordinaria.
- Mantención de ascensores.

## 9.11 Reservas

Funciones:

- Crear espacios comunes.
- Definir horarios, capacidad, duración, tarifa y depósito.
- Solicitar reserva.
- Aprobar o rechazar.
- Bloquear fechas.
- Evitar solapamientos.
- Mostrar calendario.
- Aplicar restricciones por morosidad si el condominio decide habilitarlas.

Reglas:

- La verificación de solapamiento debe ejecutarse dentro de la transacción.
- Una unidad no puede reservar dos veces el mismo espacio en el mismo horario.
- Las políticas deben ser configurables y no codificadas directamente en la vista.

## 9.12 Reportes e indicadores

Reportes mínimos:

- Estado financiero mensual.
- Recaudación mensual.
- Morosidad por torre.
- Morosidad por unidad.
- Pagos por periodo.
- Gastos por categoría.
- Comparativo mensual.
- Multas por estado.
- Mantenimientos por estado, prioridad y tiempo de resolución.
- Encomiendas pendientes.
- Uso de espacios comunes.

Formatos:

- Vista web.
- CSV.
- PDF.

Todo reporte debe respetar permisos y filtros de condominio.

---

## 10. Matriz de permisos resumida

| Acción | Admin. general | Admin. de torre | Equipo de torre | Comité | Contabilidad | Conserjería | Residente |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ver dashboard de todo el condominio | Sí | No | No | Según alcance | Según alcance | No | No |
| Ver dashboard de su torre | Sí | Sí | Según permiso | Según alcance | Según alcance | Sí, limitado | No |
| Crear usuarios | Sí | No por defecto | No | No | No | No | No |
| Activar, bloquear o desactivar usuarios | Sí | No | No | No | No | No | No |
| Asignar roles y torres | Sí | No | No | No | No | No | No |
| Designar administrador principal de torre | Sí | No | No | No | No | No | No |
| Gestionar grupo de personas de una torre | Sí | Sí, su torre | No, salvo permiso | Consulta | No | No | No |
| Administrar residentes | Sí | Sí, su torre | Según permiso y torre | Consulta | No | Consulta limitada | Solo sus datos |
| Emitir gastos comunes | Sí | Según permiso y torre | No por defecto | Consulta/aprobación | Sí, según alcance | No | No |
| Registrar pagos | Sí | Según permiso y torre | Según permiso | Consulta | Sí, según alcance | No | Subir comprobante |
| Ver morosidad global | Sí | No | No | Según alcance | Según alcance | No | Solo su unidad |
| Ver morosidad de su torre | Sí | Sí | Según permiso | Según alcance | Sí | No | Solo su unidad |
| Crear multas | Sí | Sí, su torre | Según permiso | Según permiso | No | Según permiso | No |
| Gestionar mantenimientos | Sí | Sí, su torre | Según permiso | Consulta | No | Operativo | Crear y consultar propios |
| Gestionar encomiendas | Sí | Sí, su torre | Según permiso | No | No | Sí, su torre | Consultar propias |
| Publicar comunicados | Sí | Sí, dirigidos a su torre | Según permiso | Según permiso | No | Según permiso | No |
| Subir documentos | Sí | Según categoría y torre | Según permiso | Según permiso | Según categoría | No | No |
| Ver auditoría | Sí | Solo eventos autorizados de su torre | No | Consulta autorizada | No | No | No |

Permisos mínimos adicionales:

```text
users.create
users.read
users.update
users.disable
users.assign_roles
towers.assign_administrator
towers.team.read
towers.team.manage
dashboard.read_all_towers
dashboard.read_assigned_towers
```

La implementación real utilizará permisos como `payments.create`, `payments.verify`, `fines.confirm` y `documents.publish`, siempre combinados con el alcance de condominio, torre o unidad.

## 11. Endpoints propuestos

Prefijo API: `/api/v1`.

### 11.1 Autenticación

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/change-password
GET    /api/v1/auth/me
```

### 11.2 Residentes y unidades

```text
GET    /api/v1/residents
POST   /api/v1/residents
GET    /api/v1/residents/:id
PATCH  /api/v1/residents/:id
POST   /api/v1/residents/:id/occupancies
PATCH  /api/v1/occupancies/:id/end

GET    /api/v1/towers
POST   /api/v1/towers
PATCH  /api/v1/towers/:id

GET    /api/v1/units
POST   /api/v1/units
GET    /api/v1/units/:id
PATCH  /api/v1/units/:id
GET    /api/v1/units/:id/account-statement
```

### 11.3 Gastos comunes

```text
GET    /api/v1/common-expense-periods
POST   /api/v1/common-expense-periods
GET    /api/v1/common-expense-periods/:id
PATCH  /api/v1/common-expense-periods/:id
POST   /api/v1/common-expense-periods/:id/items
POST   /api/v1/common-expense-periods/:id/calculate
POST   /api/v1/common-expense-periods/:id/issue
POST   /api/v1/common-expense-periods/:id/close
POST   /api/v1/common-expense-periods/:id/cancel
GET    /api/v1/common-expense-periods/:id/export.csv
GET    /api/v1/common-expense-periods/:id/export.pdf
```

### 11.4 Pagos y morosidad

```text
GET    /api/v1/payments
POST   /api/v1/payments
GET    /api/v1/payments/:id
POST   /api/v1/payments/:id/verify
POST   /api/v1/payments/:id/reject
POST   /api/v1/payments/:id/reverse
GET    /api/v1/delinquency
GET    /api/v1/delinquency/by-tower
```

### 11.5 Multas

```text
GET    /api/v1/fines
POST   /api/v1/fines
GET    /api/v1/fines/:id
PATCH  /api/v1/fines/:id
POST   /api/v1/fines/:id/notify
POST   /api/v1/fines/:id/appeals
POST   /api/v1/fines/:id/confirm
POST   /api/v1/fines/:id/void
```

### 11.6 Mantenimientos

```text
GET    /api/v1/maintenance-requests
POST   /api/v1/maintenance-requests
GET    /api/v1/maintenance-requests/:id
PATCH  /api/v1/maintenance-requests/:id
POST   /api/v1/maintenance-requests/:id/assign
POST   /api/v1/maintenance-requests/:id/status
POST   /api/v1/maintenance-requests/:id/comments
POST   /api/v1/maintenance-requests/:id/attachments
```

### 11.7 Encomiendas

```text
GET    /api/v1/parcels
POST   /api/v1/parcels
GET    /api/v1/parcels/:id
POST   /api/v1/parcels/:id/notify
POST   /api/v1/parcels/:id/deliver
POST   /api/v1/parcels/:id/return
```

### 11.8 Documentos

```text
GET    /api/v1/document-categories
POST   /api/v1/document-categories
GET    /api/v1/documents
POST   /api/v1/documents
GET    /api/v1/documents/:id
POST   /api/v1/documents/:id/publish
POST   /api/v1/documents/:id/archive
GET    /api/v1/documents/:id/download-url
```

### 11.9 Comunicados

```text
GET    /api/v1/announcements
POST   /api/v1/announcements
GET    /api/v1/announcements/:id
PATCH  /api/v1/announcements/:id
POST   /api/v1/announcements/:id/publish
POST   /api/v1/announcements/:id/archive
POST   /api/v1/announcements/:id/read
```

### 11.10 Reservas

```text
GET    /api/v1/amenities
POST   /api/v1/amenities
GET    /api/v1/reservations
POST   /api/v1/reservations
POST   /api/v1/reservations/:id/approve
POST   /api/v1/reservations/:id/reject
POST   /api/v1/reservations/:id/cancel
```

### 11.11 Usuarios, asignaciones y equipos de torre

```text
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
POST   /api/v1/users/:id/disable
POST   /api/v1/users/:id/enable
POST   /api/v1/users/:id/reset-password
GET    /api/v1/users/:id/assignments
POST   /api/v1/users/:id/assignments
PATCH  /api/v1/user-role-assignments/:id/end

GET    /api/v1/towers/:towerId/administrator
PUT    /api/v1/towers/:towerId/administrator
GET    /api/v1/towers/:towerId/team
POST   /api/v1/towers/:towerId/team
PATCH  /api/v1/tower-team-members/:id
PATCH  /api/v1/tower-team-members/:id/end
```

Reglas de endpoints:

- `POST /users` y las operaciones de asignación requieren `users.create` o `users.assign_roles` con alcance condominio.
- `PUT /towers/:towerId/administrator` cierra la asignación principal vigente y crea la nueva dentro de una transacción.
- El administrador de torre puede mantener datos no sensibles de su equipo solo cuando tenga `towers.team.manage`; no puede crear cuentas ni elevar permisos.
- Ningún endpoint confiará en el `towerId` sin comprobar el alcance del actor.

### 11.12 Reportes

```text
GET    /api/v1/reports/monthly-financial
GET    /api/v1/reports/collection
GET    /api/v1/reports/delinquency-by-tower
GET    /api/v1/reports/expenses-by-category
GET    /api/v1/reports/maintenance
GET    /api/v1/reports/:report/export.csv
GET    /api/v1/reports/:report/export.pdf
```

---

## 12. Formato estándar de respuesta API

Respuesta correcta:

```json
{
  "data": {
    "id": "uuid",
    "status": "verified"
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

Lista paginada:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 128,
    "totalPages": 7,
    "requestId": "uuid"
  }
}
```

Error:

```json
{
  "error": {
    "code": "PAYMENT_AMOUNT_EXCEEDS_BALANCE",
    "message": "El monto asignado supera el saldo disponible",
    "fields": {
      "amount": "Monto inválido"
    },
    "requestId": "uuid"
  }
}
```

No se deben devolver stack traces al cliente en producción.

---

## 13. Autenticación y sesiones

### 13.1 Flujo

1. El usuario envía username o email y contraseña.
2. El servidor normaliza el identificador.
3. Busca al usuario activo.
4. Comprueba bloqueo temporal.
5. Verifica hash Argon2id.
6. Regenera el ID de sesión.
7. Carga las asignaciones activas del usuario.
8. Calcula el alcance efectivo: todo el condominio, torres asignadas o unidades asociadas.
9. Guarda en sesión `userId`, `condominiumId` y el contexto activo; los permisos deben poder invalidarse al cambiar una asignación.
10. Registra último acceso y evento de auditoría.

### 13.2 Cookie

```js
{
  name: process.env.SESSION_COOKIE_NAME,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}
```

### 13.3 Controles

- Regenerar sesión después del login.
- Destruir sesión en logout.
- Limitar intentos por IP y cuenta.
- Bloqueo temporal progresivo.
- Token de recuperación de un solo uso, con hash y vencimiento.
- Requerir cambio de contraseña para cuentas creadas por administración.
- Cerrar sesiones al desactivar una cuenta.
- Reautenticación para cambios sensibles.

---

## 14. Seguridad de aplicación

### 14.1 Controles HTTP

- HTTPS obligatorio en producción.
- Helmet.
- Política CSP ajustada a EJS, HTMX y Chart.js.
- CSRF en formularios y acciones con sesión.
- CORS deshabilitado por defecto si todo opera en el mismo dominio.
- Rate limiting en login, recuperación, uploads y exportaciones.
- Límite de tamaño de body.
- Validación estricta con Zod.
- Consultas SQL parametrizadas.
- Escape automático en EJS.
- Sanitización específica para contenido enriquecido de comunicados.

### 14.2 Aislamiento por condominio, torre y unidad

Toda consulta de negocio debe incluir `condominium_id` obtenido desde la sesión autorizada. Cuando el usuario no sea administrador general, también debe restringirse por `tower_id` o por las unidades autorizadas.

Ejemplo incorrecto:

```sql
SELECT * FROM payments WHERE id = $1;
```

Ejemplo correcto para administrador general:

```sql
SELECT *
FROM payments
WHERE id = $1
  AND condominium_id = $2;
```

Ejemplo correcto para usuario con alcance de torre:

```sql
SELECT p.*
FROM payments p
JOIN units u ON u.id = p.unit_id
WHERE p.id = $1
  AND p.condominium_id = $2
  AND u.tower_id = ANY($3::uuid[]);
```

La lista `$3` se obtiene en el backend desde asignaciones activas. No se construye a partir de valores entregados libremente por el cliente.

Controles obligatorios:

- El administrador general puede acceder a todas las torres del único condominio activo.
- El administrador de torre no puede consultar, exportar ni inferir datos de otra torre.
- Los contadores de dashboard, reportes, búsquedas, archivos y notificaciones respetan el mismo alcance.
- Las URL firmadas de Storage se generan después de comprobar que el recurso pertenece a una torre o unidad autorizada.
- El cambio de rol o torre invalida las sesiones o el caché de permisos del usuario afectado.

### 14.3 Secretos

- `.env` excluido de Git.
- `SUPABASE_SERVICE_ROLE_KEY` solo en backend.
- Contraseñas de base de datos rotables.
- Secretos distintos por ambiente.
- No imprimir URLs completas de conexión en logs.
- Enmascarar tokens y credenciales en errores.

### 14.4 Archivos

- Bucket privado.
- Lista permitida de MIME.
- Tamaño máximo por categoría.
- Nombre físico aleatorio.
- URL firmada con vencimiento corto.
- Control de autorización antes de generar la URL.
- Registro de subida, descarga sensible y eliminación lógica.

---

## 15. Auditoría

Eventos mínimos:

- Login correcto e incorrecto.
- Bloqueo y desbloqueo de usuario.
- Creación, edición y desactivación de residentes.
- Cambios de ocupación.
- Emisión y cierre de gastos comunes.
- Creación, verificación, rechazo y reversa de pagos.
- Creación, confirmación y anulación de multas.
- Cambios de estado de mantenimiento.
- Publicación y archivo de documentos.
- Publicación de comunicados.
- Creación, activación, bloqueo y desactivación de usuarios.
- Cambios de roles, permisos y alcances.
- Designación o reemplazo del administrador principal de una torre.
- Incorporación o desvinculación de integrantes del equipo de una torre.
- Cambios de configuración financiera.

La auditoría debe registrar datos anteriores y posteriores solo cuando sean necesarios y seguros.

---

## 16. Notificaciones

Canales iniciales:

- Centro de notificaciones interno.
- Correo electrónico.

Canales posteriores:

- Push web.
- WhatsApp mediante proveedor autorizado.

Eventos sugeridos:

- Gasto común emitido.
- Pago recibido y verificado.
- Pago rechazado.
- Vencimiento próximo.
- Unidad en mora.
- Multa notificada.
- Respuesta a apelación.
- Mantenimiento actualizado.
- Encomienda recibida.
- Comunicado publicado.
- Reserva aprobada o rechazada.

Las notificaciones deben generarse mediante una tabla de trabajos o cola. Para el MVP puede utilizarse PostgreSQL como cola persistente y un worker Node separado.

---

## 17. Consultas SQL y transacciones críticas

Deben ejecutarse dentro de transacciones:

- Emisión de gastos comunes.
- Creación de cargos por unidad.
- Verificación y asignación de pagos.
- Reversa de pagos.
- Confirmación de una multa y su incorporación a cuenta.
- Cierre de periodo.
- Aprobación de reserva con comprobación de solapamiento.
- Cambio de ocupante principal.

Utilidad recomendada:

```js
import { pool } from './pool.js'

export async function withTransaction(callback) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

---

## 18. Migraciones iniciales

Orden recomendado:

1. Extensiones PostgreSQL y funciones comunes.
2. Condominios.
3. Torres y unidades.
4. Personas y ocupaciones.
5. Usuarios, roles, permisos, asignaciones por alcance y equipos de torre.
6. Restricción de un administrador principal activo por torre.
7. Sesiones y tokens de recuperación.
8. Categorías y periodos de gastos comunes.
9. Ítems, cargos, pagos y asignaciones.
10. Multas y apelaciones.
11. Mantenimientos.
12. Encomiendas.
13. Documentos.
14. Comunicados.
15. Espacios y reservas.
16. Notificaciones.
17. Auditoría.
18. Vistas e índices.
19. Datos base y permisos iniciales.

Extensiones propuestas:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
```

Función de actualización:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Cada tabla editable debe tener su trigger correspondiente.

---

## 19. Índices necesarios

Índices mínimos:

```text
app_users(lower(email))
app_users(lower(username))
user_role_assignments(user_id, ends_at)
user_role_assignments(condominium_id, scope_type, tower_id, ends_at)
tower_team_members(tower_id, ends_on)
tower_team_members(person_id, ends_on)
unit_occupancies(unit_id, starts_on, ends_on)
unit_occupancies(person_id, starts_on, ends_on)
common_expense_periods(condominium_id, year, month)
unit_charges(period_id, unit_id)
unit_charges(unit_id, status, due_date)
payments(condominium_id, paid_at desc)
payments(unit_id, status, paid_at desc)
payment_allocations(payment_id)
payment_allocations(unit_charge_id)
fines(unit_id, status, incident_at desc)
maintenance_requests(condominium_id, status, priority)
maintenance_requests(unit_id, created_at desc)
parcels(unit_id, status, received_at desc)
documents(condominium_id, category_id, published_at desc)
announcements(condominium_id, status, published_at desc)
reservations(amenity_id, starts_at, ends_at)
notifications(user_id, read_at, created_at desc)
audit_logs(condominium_id, entity_type, entity_id, created_at desc)
```

Se deben revisar con `EXPLAIN ANALYZE` después de contar con datos representativos.

---

## 20. Búsqueda, filtros y paginación

Todas las listas grandes deben utilizar paginación en servidor.

Parámetros estándar:

```text
?page=1&pageSize=20&sort=createdAt&direction=desc&search=texto
```

Filtros habituales:

- Torre.
- Unidad.
- Estado.
- Periodo.
- Rango de fechas.
- Categoría.
- Responsable.

No se debe interpolar directamente el nombre de la columna de orden en SQL. Se utilizará una lista permitida por endpoint.

---

## 21. Docker

### 21.1 Dockerfile propuesto

```dockerfile
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first

RUN groupadd --system nodeapp \
  && useradd --system --gid nodeapp --create-home nodeapp

COPY --from=build --chown=nodeapp:nodeapp /app ./

USER nodeapp
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node scripts/healthcheck.js || exit 1

CMD ["node", "src/server.js"]
```

### 21.2 `compose.yaml`

```yaml
services:
  app:
    build: .
    container_name: condominio-jmc
    restart: unless-stopped
    env_file:
      - .env
    environment:
      NODE_ENV: production
      NODE_OPTIONS: --dns-result-order=ipv4first
      TZ: America/Santiago
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "node", "scripts/healthcheck.js"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

La base de datos no se levanta en Compose porque será Supabase administrado.

---

## 22. Health checks

### `GET /health/live`

Comprueba que el proceso responde.

### `GET /health/ready`

Comprueba:

- Consulta `SELECT 1` a PostgreSQL.
- Resolución IPv4 del pooler.
- Configuración mínima cargada.

La respuesta pública no debe revelar hostname, credenciales ni detalles internos.

---

## 23. Observabilidad

Logs JSON con:

- `timestamp`
- `level`
- `requestId`
- `userId`
- `condominiumId`
- `route`
- `method`
- `statusCode`
- `durationMs`
- `errorCode`

No registrar:

- Contraseñas.
- Cookies.
- Authorization headers.
- DATABASE_URL.
- Service role key.
- Contenido completo de documentos.

Métricas sugeridas:

- Solicitudes HTTP.
- Latencia por endpoint.
- Errores 4xx y 5xx.
- Conexiones activas del pool.
- Consultas lentas.
- Trabajos de notificación pendientes.
- Archivos subidos.
- Intentos de login fallidos.

---

## 24. Pruebas

### 24.1 Unitarias

- Cálculo de prorrateo.
- Distribución de pagos.
- Cálculo de saldo.
- Estados permitidos.
- Permisos.
- Validación de fechas.
- Detección de reservas solapadas.

### 24.2 Integración

- Repositorios SQL.
- Transacciones.
- Emisión de periodo.
- Verificación y reversa de pago.
- Creación y resolución de multa.
- Storage mock o entorno de prueba.

### 24.3 End-to-end

Escenarios:

1. Administrador general inicia sesión.
2. Crea una torre y sus unidades.
3. Crea un usuario y lo designa administrador principal de la torre.
4. Agrega personas al grupo de trabajo de la torre y entrega acceso solo a quienes corresponda.
5. El administrador de torre inicia sesión y comprueba que solo puede ver su torre.
6. Se intenta consultar otra torre y el backend responde con acceso denegado.
7. El administrador de torre registra un residente y su ocupación.
8. Se crea y emite un periodo de gasto común.
9. El residente consulta su estado de cuenta.
10. Registra comprobante de pago.
11. Contabilidad verifica el pago.
12. El saldo queda actualizado.
13. La creación de usuario, asignación de torre y operación financiera aparecen en auditoría.

### 24.4 Condiciones de prueba

- Base local PostgreSQL en Docker para CI.
- Datos semilla repetibles.
- Cada prueba limpia sus datos.
- No ejecutar pruebas automatizadas contra producción.

---

## 25. Datos semilla

El seed inicial debe crear:

- Condominio José Miguel Carrera.
- Tres torres de demostración.
- Un conjunto pequeño de unidades.
- Roles y permisos.
- Un usuario `condominium_admin` inicial con acceso a todo el condominio.
- Un administrador principal de demostración por cada torre.
- Un grupo pequeño de personas por torre, algunas con usuario y otras solo como integrantes del equipo.
- Asignaciones y permisos de alcance torre.
- Categorías de gastos.
- Categorías documentales.
- Estados y configuraciones base.
- Espacios comunes de ejemplo.

El administrador general inicial y todo usuario creado por este deben recibir una contraseña temporal y quedar con `must_change_password = true`.

---

## 26. Importación de información existente

Se debe preparar un importador CSV con modo de simulación.

### Archivos sugeridos

- `towers.csv`
- `units.csv`
- `people.csv`
- `occupancies.csv`
- `opening_balances.csv`
- `historical_payments.csv`

Proceso:

1. Cargar archivo.
2. Validar estructura.
3. Normalizar datos.
4. Mostrar errores por fila.
5. Ejecutar simulación sin guardar.
6. Confirmar importación.
7. Insertar en transacción.
8. Generar reporte de resultado.

---

## 27. Exportaciones PDF y CSV

### PDFs mínimos

- Estado de cuenta por unidad.
- Resumen mensual de gastos comunes.
- Comprobante de pago.
- Informe de morosidad.
- Informe de multas.
- Informe de mantenimiento.

Cada PDF debe incluir:

- Logo.
- Nombre del condominio.
- Fecha de generación.
- Periodo.
- Usuario que generó el documento cuando corresponda.
- Identificador verificable.

Los CSV deben usar UTF-8 y columnas explícitas, sin fórmulas provenientes de datos de usuario.

---

## 28. PWA y experiencia móvil

Funciones:

- `manifest.webmanifest`.
- Iconos instalables.
- Service worker para assets estáticos.
- Pantalla de conexión perdida.
- Navegación móvil.
- Atajos a pagos, avisos, encomiendas, mantenimientos y reservas.

No se debe cachear información financiera privada de forma indiscriminada. Las respuestas autenticadas deben utilizar políticas de caché restrictivas.

---

## 29. Fases de implementación

### Fase 0: definición y preparación

- Confirmar roles finales.
- Confirmar reglas de prorrateo.
- Confirmar proceso real de pagos.
- Confirmar reglas de multas.
- Confirmar categorías documentales.
- Copiar string exacto de Session pooler IPv4.
- Crear repositorio, convenciones y CI.

### Fase 1: núcleo técnico

- Proyecto Node.js.
- Express, EJS, HTMX y Tailwind.
- Configuración de entornos.
- Pool PostgreSQL.
- Migraciones.
- Logging.
- Manejo de errores.
- Autenticación.
- Sesiones.
- RBAC.
- Auditoría base.

### Fase 2: estructura del condominio

- Condominio.
- Torres.
- Unidades.
- Personas.
- Ocupaciones.
- Administrador general.
- Creación de usuarios.
- Asignaciones de roles por condominio y torre.
- Administrador principal de cada torre.
- Grupo de personas de cada torre.
- Usuarios asociados a integrantes del grupo cuando corresponda.
- Importación CSV.

### Fase 3: finanzas

- Categorías.
- Periodos.
- Gastos.
- Cálculo y emisión.
- Cargos por unidad.
- Pagos.
- Asignaciones.
- Morosidad.
- Estados de cuenta.
- Exportaciones.

### Fase 4: operación

- Multas.
- Mantenimientos.
- Encomiendas.
- Notificaciones.

### Fase 5: comunidad

- Comunicados.
- Documentos.
- Reservas.
- Portal del residente.

### Fase 6: reportes y cierre

- Dashboard final.
- Reportes.
- PWA.
- Pruebas E2E.
- Revisión de seguridad.
- Manuales.
- Despliegue productivo.

---

## 30. Criterios de aceptación del MVP

El MVP estará funcional cuando:

- Un administrador general pueda iniciar sesión de forma segura y ver todo el condominio.
- El administrador general pueda crear, activar, bloquear y desactivar usuarios.
- El administrador general pueda asignar roles y torres.
- Cada torre tenga exactamente un administrador principal activo.
- Cada torre permita mantener un grupo de personas con o sin cuenta de acceso.
- Un administrador de torre solo pueda ver y operar sobre su torre.
- Un integrante del equipo solo pueda ejecutar las acciones concedidas dentro de sus torres asignadas.
- Pueda crear torres, unidades y residentes.
- Pueda mantener historial de ocupación.
- Pueda crear y emitir un periodo de gastos comunes.
- El sistema genere cargos por unidad.
- Pueda registrar y verificar pagos parciales o totales.
- El saldo y la morosidad se actualicen correctamente.
- Un residente pueda consultar solo su información.
- Puedan crearse multas y solicitudes de mantenimiento.
- Puedan publicarse comunicados y documentos privados.
- Puedan registrarse y entregar encomiendas.
- Los roles limiten las operaciones correctamente.
- Las acciones financieras sensibles queden auditadas.
- La aplicación funcione en escritorio y móvil.
- La conexión a Supabase utilice el Session pooler IPv4.
- El despliegue cuente con HTTPS, backups y monitoreo básico.

---

## 31. Lista de decisiones pendientes

Estas decisiones deben resolverse antes de codificar las reglas definitivas:

1. ¿Qué cargos concretos existirán dentro del grupo de personas de una torre?
2. ¿Qué permisos tendrá cada cargo del equipo de torre?
3. ¿El administrador de torre podrá solicitar la creación de cuentas, aunque la creación final quede en manos del administrador general?
4. ¿Un integrante podrá pertenecer simultáneamente a más de una torre?
5. ¿Cómo se calcula exactamente el prorrateo?
6. ¿Se aplican intereses por mora? ¿Desde qué fecha y con qué fórmula?
7. ¿Los pagos se verifican manualmente o mediante integración bancaria?
8. ¿Una multa se cobra inmediatamente o en el siguiente gasto común?
9. ¿Quién puede confirmar o anular multas?
10. ¿Los residentes pueden crear mantenimientos desde el portal?
11. ¿Las reservas requieren aprobación?
12. ¿La morosidad bloquea reservas?
13. ¿Se requiere firma o confirmación de entrega de encomiendas?
14. ¿Qué documentos puede ver cada rol?
15. ¿Se enviarán correos, push o WhatsApp?
16. ¿Existe información histórica para importar?
17. ¿Se requiere integración con sistema contable externo?
18. ¿Se almacenará RUT y qué personas necesitan ese dato?
19. ¿Cuánto tiempo deben conservarse auditorías y documentos?

---

## 32. Comandos iniciales sugeridos

```bash
mkdir condominio-jmc
cd condominio-jmc
npm init -y

npm install express ejs htmx.org pg zod dotenv argon2 express-session connect-pg-simple helmet express-rate-limit pino pino-http multer @supabase/supabase-js chart.js

npm install -D tailwindcss postcss autoprefixer nodemon vitest supertest playwright eslint prettier node-pg-migrate
```

Scripts sugeridos:

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "build": "npm run css:build",
    "css:build": "tailwindcss -i ./src/public/css/input.css -o ./src/public/css/app.css --minify",
    "css:watch": "tailwindcss -i ./src/public/css/input.css -o ./src/public/css/app.css --watch",
    "db:migrate": "node-pg-migrate up",
    "db:rollback": "node-pg-migrate down",
    "db:seed": "node scripts/seed.js",
    "db:check-ipv4": "node scripts/check-ipv4.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

---

## 33. Configuración base de Express

```js
import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import pinoHttp from 'pino-http'

import { pool } from './db/pool.js'
import { sessionMiddleware } from './config/session.js'
import { errorHandler } from './middleware/error-handler.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.set('view engine', 'ejs')
  app.set('views', new URL('./views', import.meta.url).pathname)

  app.use(pinoHttp())
  app.use(helmet())
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.static('src/public'))
  app.use(sessionMiddleware(pool))

  app.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'ok' })
  })

  app.get('/health/ready', async (_req, res, next) => {
    try {
      await pool.query('SELECT 1')
      res.status(200).json({ status: 'ready' })
    } catch (error) {
      next(error)
    }
  })

  // app.use('/api/v1/...', routes)
  // app.use('/app/...', pageRoutes)

  app.use(errorHandler)

  return app
}
```

---

## 34. Repositorio SQL de ejemplo

```js
export class ResidentRepository {
  constructor(db) {
    this.db = db
  }

  async list({ condominiumId, authorizedTowerIds, search, limit, offset }) {
    const result = await this.db.query(
      `SELECT
         p.id,
         concat_ws(' ', p.first_name, p.last_name) AS full_name,
         p.email,
         p.phone,
         u.number AS unit_number,
         t.name AS tower_name,
         uo.occupancy_type
       FROM people p
       JOIN unit_occupancies uo ON uo.person_id = p.id
       JOIN units u ON u.id = uo.unit_id
       JOIN towers t ON t.id = u.tower_id
       WHERE u.condominium_id = $1
         AND u.tower_id = ANY($2::uuid[])
         AND uo.ends_on IS NULL
         AND (
           $3 = '' OR
           p.first_name ILIKE '%' || $3 || '%' OR
           p.last_name ILIKE '%' || $3 || '%' OR
           u.number ILIKE '%' || $3 || '%'
         )
       ORDER BY p.last_name, p.first_name
       LIMIT $4 OFFSET $5`,
      [condominiumId, authorizedTowerIds, search, limit, offset]
    )

    return result.rows
  }
}
```

---

## 35. Automatizaciones internas propuestas

Trabajos programados:

- Publicar comunicados programados.
- Archivar comunicados vencidos.
- Marcar cargos vencidos.
- Crear recordatorios de pago.
- Recordar reservas próximas.
- Recordar encomiendas no retiradas.
- Detectar mantenimientos sin actualización.
- Limpiar tokens expirados.
- Limpiar sesiones vencidas.
- Verificar integridad de archivos y registros.

Para evitar ejecuciones duplicadas cuando existan varias instancias Node, cada trabajo debe utilizar un bloqueo PostgreSQL o una tabla de jobs con adquisición atómica.

---

## 36. Respaldos y recuperación

- Confirmar política de backups del plan Supabase contratado.
- Exportar periódicamente datos críticos mediante `pg_dump` desde un entorno autorizado.
- Mantener copia de documentos críticos según la política del condominio.
- Probar restauración en un ambiente separado.
- Documentar responsables y procedimiento de recuperación.
- Registrar fecha de la última prueba de restauración.

No se debe considerar un respaldo correcto solo porque el proceso terminó: la restauración debe probarse.

---

## 37. Despliegue productivo

Flujo recomendado:

1. Push a repositorio privado.
2. Ejecutar lint y pruebas.
3. Construir imagen Docker.
4. Ejecutar migraciones controladas.
5. Desplegar nueva imagen.
6. Comprobar `/health/ready`.
7. Ejecutar prueba básica de login y dashboard.
8. Mantener opción de rollback de imagen.

Infraestructura mínima:

- VPS Linux.
- Docker.
- Proxy HTTPS.
- Dominio.
- Certificado TLS.
- Variables de entorno protegidas.
- Logs persistentes o enviados a un sistema central.
- Monitor de disponibilidad.

---

## 38. Reglas para el agente de desarrollo o Codex

1. No utilizar ORM; acceder a PostgreSQL con `pg`.
2. Utilizar `Pool`, no mantener un `Client` global conectado manualmente.
3. Utilizar Supavisor Session Pooler por IPv4.
4. No usar el hostname directo `db.<project>.supabase.co` sin IPv4 dedicado.
5. Toda consulta debe ser parametrizada.
6. Toda entidad debe estar filtrada por `condominium_id` cuando corresponda.
7. Para usuarios que no sean `condominium_admin`, toda consulta debe aplicar además el alcance de torre o unidad.
8. Solo el administrador general crea usuarios y asigna roles por defecto.
9. Cada torre debe conservar exactamente un administrador principal activo y el historial de reemplazos.
10. El grupo de personas de la torre debe admitir integrantes con y sin cuenta de usuario.
11. No confiar en `towerId`, `unitId`, rol ni permisos enviados por el navegador.
12. No colocar lógica de negocio en rutas o vistas.
13. Usar transacciones para operaciones financieras y para reemplazar al administrador principal de una torre.
14. No editar registros financieros históricos destructivamente.
15. Mantener auditoría de operaciones sensibles.
16. Mantener Storage privado.
17. Generar URL firmadas únicamente después de autorizar al usuario y comprobar su alcance.
18. No exponer `SUPABASE_SERVICE_ROLE_KEY` al navegador.
19. No guardar secretos en el repositorio.
20. Agregar migración y prueba para cada cambio de base de datos.
21. Agregar validación Zod a cada entrada.
22. Implementar permisos en backend aunque la interfaz oculte el botón.
23. Mantener UI responsive y coherente con la identidad azul marino/dorado.
24. Utilizar CLP como entero y `America/Santiago` como zona horaria de presentación.
25. Documentar cualquier decisión que cambie este plan.

## 39. Resultado esperado

La aplicación final debe representar digitalmente las pantallas observadas en las imágenes:

- Portada y marca del condominio.
- Panel principal con indicadores en tiempo real.
- Catálogo de módulos.
- Gestión centralizada del condominio y sus torres.
- Administrador general con visibilidad total y creación de usuarios.
- Un administrador principal y un grupo de personas por torre.
- Restricción de datos y operaciones según torre asignada.
- Gestión de residentes.
- Control mensual de gastos comunes.
- Pagos recientes y morosidad por torre.
- Registro de multas.
- Solicitudes y seguimiento de mantenimientos.
- Comunicados y avisos.
- Biblioteca documental.
- Reportes e indicadores.
- Acceso responsive desde computador y teléfono.
- Beneficios diferenciados para residentes, comité, administración y comunidad.

La primera versión debe priorizar exactitud financiera, aislamiento entre torres, creación centralizada de usuarios, permisos, trazabilidad y facilidad de uso antes de incorporar integraciones externas o automatizaciones avanzadas.

---

## 40. Referencias oficiales consultadas

- [Node.js: versiones y ciclo LTS](https://nodejs.org/en/about/previous-releases)
- [Node.js: descarga de la versión LTS](https://nodejs.org/en/download)
- [Supabase: conexión a PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: compatibilidad IPv4 e IPv6](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP)
- [Supabase: dirección IPv4 dedicada](https://supabase.com/docs/guides/platform/ipv4-address)
- [node-postgres: conexión mediante connection string](https://node-postgres.com/features/connecting)
- [node-postgres: connection pooling](https://node-postgres.com/features/pooling)

