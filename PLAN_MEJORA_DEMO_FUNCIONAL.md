# Plan de mejora: demo funcional del Condominio José Miguel Carrera

## Diagnóstico

La implementación actual cumple parcialmente el plan maestro:

- Existe una demo web navegable con EJS, Tailwind, sesiones, roles y datos mutables en memoria.
- Los módulos visibles en las fotografías están representados: dashboard, residentes, torres, gastos comunes, pagos, multas, mantenimientos, encomiendas, documentos, comunicados, reservas, reportes y usuarios.
- La identidad visual está alineada: navegación azul marino, acentos dorados, tarjetas claras, logo del condominio, navegación móvil y PWA básica.
- `npm test` pasa con 16 pruebas, `npm run lint` pasa y `npm run build` compila CSS.

No está terminado el sistema descrito en el plan maestro:

- La demo usa `src/shared/demo/demo-store.js`; no persiste módulos de negocio en Supabase.
- Las migraciones solo cubren el núcleo organizacional, usuarios, sesiones y auditoría. Faltan gastos, cargos, pagos, multas, mantenimientos, encomiendas, documentos, comunicados, reservas, notificaciones y vistas SQL.
- No existe la API `/api/v1` propuesta.
- No están implementados Storage privado con URLs firmadas, correo, cola de notificaciones, PDF, importación CSV ni pruebas Playwright.
- Faltan CSRF, recuperación real de contraseña, validación Zod completa en la demo y controles de seguridad de archivos.
- `src/app.js` monta principalmente las rutas demo; los módulos SQL existentes no constituyen todavía un flujo productivo completo.
- La demo contiene simplificaciones intencionales: datos generados, autenticación con credenciales demo y acciones en memoria.

## Objetivo de cierre

Entregar una demo funcional y presentable que permita recorrer los flujos de las fotografías sin errores, con datos demo consistentes, alcance por rol, operaciones mutables y una guía clara para conectar posteriormente Supabase.

## Fase 1: cerrar la experiencia visual

1. Comparar cada pantalla con las fotografías de `Fotosdocumentacion`:
   - Dashboard con cuatro indicadores, recaudación, morosidad por torre y actividad reciente.
   - Gastos comunes con totales y tabla mensual.
   - Módulos en tarjetas y navegación lateral.
   - Residentes con datos personales, unidad, torre, contacto e historial.
   - Multas, mantenimientos, documentos y comunicados con estados visibles.
2. Usar el logo de `src/public/img/logo-jmc.jpg` de forma consistente en login, encabezado y navegación.
3. Revisar responsive en 375px, 768px y escritorio: tablas, formularios, menú móvil, botones y tarjetas.
4. Corregir textos, formatos CLP, fechas `America/Santiago`, estados y enlaces rotos.
5. Mantener contraste, foco visible, labels, navegación por teclado y mensajes de error asociados.

## Fase 2: completar el flujo demo de negocio

1. Autenticación demo:
   - Login para administrador general, administrador de torre, contabilidad, conserjería, comité y residente.
   - Logout, cambio de contraseña demo y recuperación simulada claramente identificada.
   - Mensajes de error y redirecciones coherentes.
2. Administrador general:
   - Crear y editar torres y unidades.
   - Crear personas, usuarios y asignaciones.
   - Designar y reemplazar administrador principal conservando historial.
   - Mantener equipos de torre con y sin cuenta.
3. Administrador de torre y equipo:
   - Ver solo torres y unidades asignadas.
   - Crear residentes, ocupaciones y mantenimientos dentro del alcance.
   - Impedir acceso directo a otra torre con respuesta 403.
4. Residente:
   - Ver solo su unidad, ocupaciones, cargos, pagos, multas, encomiendas, avisos y reservas.
   - Crear solicitud de mantenimiento y solicitud de reserva cuando corresponda.
5. Finanzas:
   - Crear periodo, agregar gastos, emitir cargos, registrar pago, verificar, rechazar y reversar.
   - Recalcular saldo y morosidad en cada operación demo.
   - Mostrar estado de cuenta y exportación CSV.
6. Operación:
   - Flujo de multa: borrador, notificada, apelada, confirmada, pagada y anulada.
   - Flujo de mantenimiento con responsable, comentarios, estados e historial.
   - Flujo de encomienda: recibida, notificada, entregada y devuelta.
   - Flujo de documento y comunicado con publicación y archivo.
   - Flujo de reserva con aprobación, rechazo, cancelación y validación de solapamiento.
7. Auditoría demo:
   - Registrar actor, acción, entidad, fecha y torre en cada operación sensible.
   - Mostrar auditoría filtrada por alcance.

## Fase 3: calidad y pruebas de aceptación

1. Añadir pruebas de ruta para cada módulo principal y cada acción POST.
2. Añadir pruebas de aislamiento:
   - Administrador de torre no accede a otra torre.
   - Residente no accede a otra unidad.
   - Roles sin permiso reciben 403.
3. Añadir pruebas de invariantes:
   - Un administrador principal activo por torre.
   - No se entrega una encomienda sin receptor y fecha.
   - No se verifica un pago cero, negativo o superior al saldo.
   - No se aprueba una reserva solapada.
   - No se modifica un periodo cerrado.
4. Añadir una prueba E2E mínima con Playwright:
   - Login admin.
   - Crear torre y unidad.
   - Crear persona y ocupación.
   - Registrar y verificar pago.
   - Login de torre y comprobar aislamiento.
   - Login de residente y comprobar vista limitada.
5. Ejecutar como criterio de cierre:
   - `npm test`
   - `npm run lint`
   - `npm run build`
   - prueba E2E en escritorio y móvil.

## Fase 4: preparar persistencia Supabase

Esta fase no debe bloquear la demo visual. Se ejecuta después de cerrar los flujos demo.

1. Crear migraciones SQL para todas las entidades del plan maestro.
2. Crear repositorios, servicios y controladores por módulo.
3. Mover cada mutación demo a una transacción PostgreSQL equivalente.
4. Crear vistas financieras y de reportes.
5. Montar las rutas SQL en `src/app.js` sin duplicar rutas demo.
6. Mantener `DATA_MODE=demo` y `DATA_MODE=postgres` como modos explícitos, no mezclados.
7. Conectar Session Pooler IPv4, comprobar DNS IPv4 y mantener secretos fuera de Git.
8. Integrar Supabase Storage privado, archivos aleatorios, validación MIME/tamaño y URLs firmadas.

## Fase 5: seguridad y operación

1. Implementar CSRF para todos los formularios y POST con sesión.
2. Completar recuperación de contraseña con token de un solo uso y expiración.
3. Aplicar rate limiting a login, recuperación, uploads y exportaciones.
4. Completar validación Zod en límites de entrada.
5. Agregar headers CSP de producción y política de caché para respuestas autenticadas.
6. Completar Dockerfile, `compose.yaml`, health checks, logs estructurados y monitoreo básico.
7. Documentar despliegue, seed, roles demo, credenciales de prueba y respaldo de Supabase.

## Criterio final de demo funcional

La demo se considera cerrada cuando:

- Todas las pantallas de las fotografías tienen una ruta funcional y datos visibles.
- Cada módulo permite al menos consultar, crear o cambiar su estado según corresponda.
- Los seis perfiles demo tienen un recorrido verificable.
- El aislamiento por torre y unidad está probado, no solo oculto en la interfaz.
- Las operaciones sensibles actualizan los indicadores y dejan auditoría.
- La aplicación funciona sin PostgreSQL en `DATA_MODE=demo`.
- La interfaz es usable en móvil y escritorio.
- Las pruebas, lint y build pasan sin errores.

## Fuera de alcance de la demo

- Pagos bancarios reales.
- Envío real de correos o WhatsApp.
- Almacenamiento real de documentos.
- PDF firmado o integración contable externa.
- Datos reales de residentes.

Esas funciones pertenecen a la fase Supabase/productiva y no deben simularse como si ya estuvieran conectadas.
