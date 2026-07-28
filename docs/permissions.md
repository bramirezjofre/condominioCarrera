# Permisos

Codigos base sembrados:

- `users.create`
- `users.read`
- `users.update`
- `users.disable`
- `users.assign_roles`
- `towers.assign_administrator`
- `towers.team.read`
- `towers.team.manage`
- `dashboard.read_all_towers`
- `dashboard.read_assigned_towers`

Los permisos se asignan a roles en la tabla `role_permissions`. Una asignacion a un usuario ocurre en `user_role_assignments` con `scope_type` en `condominium`, `tower` o `unit`. Toda accion sensible debe validar:

1. Permiso presente en `permissions` del usuario.
2. `condominium_id` coincidente.
3. `tower_id` (o `unit_id`) dentro del alcance permitido.

Si el usuario es `condominium_admin` con `scope_type = 'condominium'`, el alcance cubre todas las torres activas del condominio.