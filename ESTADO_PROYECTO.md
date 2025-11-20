# 📊 Estado del Proyecto Kanban Académico

## ✅ LO IMPLEMENTADO

### 🔐 Autenticación & Roles
- ✅ Registro de usuarios (username, email, password, role, id_number)
- ✅ Login con JWT (access/refresh tokens)
- ✅ Roles: estudiante y docente
- ✅ Redirección automática según rol después del login
- ✅ Rutas privadas con `PrivateRoute`
- ✅ Persistencia de autenticación en localStorage
- ✅ Endpoint `/api/me/` para obtener perfil del usuario
- ✅ Validación de ID de 10 dígitos en registro
- ✅ Validación de username (sin espacios, caracteres permitidos)
- ✅ Removidas columnas `first_name` y `last_name` de `auth_user` (solo se usa `username`)

### 📋 Tableros (Boards)
- ✅ CRUD completo de tableros
- ✅ Crear tablero con nombre, color y fecha límite
- ✅ Editar tablero (nombre, color, fecha límite)
- ✅ Ver tableros del usuario (docente ve los que creó, estudiante ve los que le invitaron)
- ✅ Dashboard separado para docentes y estudiantes
- ✅ Gestión de miembros (invitar por username o ID de 10 dígitos)
- ✅ Fecha límite del tablero (solo editable por docente)
- ✅ Visualización de fecha límite en tableros

### 📝 Listas (Columnas)
- ✅ CRUD completo de listas
- ✅ Crear listas en tableros
- ✅ Editar título de lista (doble clic o botón)
- ✅ Eliminar listas (solo docentes)
- ✅ Ordenamiento por posición
- ✅ Layout en grid de 3 columnas

### 🃏 Tarjetas (Cards)
- ✅ CRUD completo de tarjetas
- ✅ Crear tarjetas con título y fecha límite
- ✅ Editar tarjetas (título, fecha límite, prioridad) - solo docentes
- ✅ Eliminar tarjetas (solo docentes)
- ✅ Drag & Drop entre listas
- ✅ Validación de fecha límite (no puede exceder fecha del tablero)
- ✅ Prioridad automática basada en fecha límite
- ✅ Campos: título, descripción, fecha límite, prioridad, responsables
- ✅ Modal de detalles simplificado (solo: nombre, prioridad, fecha límite, responsables)

### 👥 Responsables (Assignees)
- ✅ Asignar/desasignar estudiantes a tarjetas
- ✅ Visualización de responsables en tarjetas
- ✅ Modal para gestionar asignados
- ✅ Solo docentes pueden gestionar asignados

### 🏷️ Etiquetas (Labels)
- ✅ Modelo de etiquetas implementado
- ✅ Endpoints para crear/gestionar etiquetas
- ⚠️ No visible en el modal de tarjeta (fue simplificado)

### 💬 Comentarios
- ✅ Modelo y endpoints implementados
- ⚠️ No visible en el modal de tarjeta (fue simplificado)

### ✅ Checklist
- ✅ Modelo y endpoints implementados
- ⚠️ No visible en el modal de tarjeta (fue simplificado)

### 📊 Actividad (ActivityLog)
- ✅ Modelo implementado
- ✅ Registro de actividades (creación de tableros, listas, tarjetas, movimientos, eliminaciones)
- ✅ Endpoint `/api/boards/{id}/activity/`
- ⚠️ No hay vista en frontend para mostrar historial

### 🔍 Búsqueda/Filtros
- ✅ Endpoint de búsqueda `/api/cards/search/` implementado
- ✅ Filtros por: texto, responsable, vencimiento (overdue, soon)
- ✅ Modal de búsqueda en BoardView
- ✅ Filtros activos visibles en la UI

### 🎨 UI/UX
- ✅ Modo oscuro y claro (dark/light mode) con toggle
- ✅ Sistema de temas persistente (Zustand + localStorage)
- ✅ Toggle de tema con botón sol/luna en modal de perfil
- ✅ Imagen de fondo personalizable (excepto login)
- ✅ Efecto glassmorphism (transparencias y backdrop-blur)
- ✅ Tipografía moderna (Google Fonts - Inter)
- ✅ Botones modernos con estilos consistentes (btn-primary, btn-secondary, btn-danger, btn-success)
- ✅ Formularios modernos con estilos mejorados
- ✅ Feedback visual de cargas
- ✅ Manejo de errores
- ✅ Diseño responsive
- ✅ Drag & Drop funcional
- ✅ Validaciones en formularios
- ✅ Mostrar/ocultar contraseña en login y registro
- ✅ Perfil de usuario visible en ambos dashboards
- ✅ Texto visible y legible en ambos modos (oscuro y claro)
- ✅ Botones y enlaces consistentes y visibles en toda la aplicación

### 🔒 Permisos
- ✅ Solo docentes pueden crear/editar/eliminar tableros
- ✅ Solo docentes pueden crear/editar/eliminar listas
- ✅ Solo docentes pueden crear/editar/eliminar tarjetas
- ✅ Solo docentes pueden editar fecha límite y prioridad de tarjetas
- ✅ Solo docentes pueden gestionar miembros
- ✅ Solo docentes pueden gestionar asignados
- ✅ Estudiantes pueden ver y mover tarjetas entre listas
- ✅ Validación de membresía en todos los endpoints

### 🎨 Sistema de Temas (Dark/Light Mode)
- ✅ Toggle de tema con botón sol/luna en modal de perfil
- ✅ Persistencia de preferencia de tema (localStorage)
- ✅ Estado global con Zustand (`useThemeStore`)
- ✅ CSS-driven styling con `data-theme` attribute
- ✅ Transiciones suaves entre modos
- ✅ Estilos consistentes en todos los componentes
- ✅ Configuración centralizada de imagen de fondo

### 🖼️ Diseño Visual
- ✅ Imagen de fondo personalizable (configurable en `frontend/src/config/background.ts`)
- ✅ Efecto glassmorphism (backdrop-blur + transparencias)
- ✅ Componentes semi-transparentes (tableros, columnas, tarjetas)
- ✅ Tipografía moderna (Google Fonts - Inter)
- ✅ Sistema de botones consistente (btn-primary, btn-secondary, btn-danger, btn-success)
- ✅ Formularios modernos con estilos mejorados
- ✅ Contraste optimizado para ambos modos (oscuro y claro)

### 📚 Documentación API
- ✅ drf-spectacular configurado
- ✅ Endpoints `/api/schema/`, `/api/docs/`, `/api/redoc/`

---

## ❌ LO QUE FALTA

### 🔐 Autenticación
- ❌ `PATCH /api/me/` - Actualizar perfil (parcialmente implementado pero no probado)

### 🃏 Tarjetas
- ❌ Adjuntos (link o mock) - Modelo no implementado
- ⚠️ Descripción - Campo existe pero no se muestra en modal simplificado
- ⚠️ Checklist - Endpoints existen pero no se usa en UI
- ⚠️ Comentarios - Endpoints existen pero no se usa en UI
- ⚠️ Etiquetas - Endpoints existen pero no se usa en UI

### 📊 Actividad
- ❌ Vista de historial de actividades en frontend
- ⚠️ Endpoint existe pero no se consume

### 🔍 Búsqueda
- ⚠️ Funcional pero podría mejorarse la UI

### 🧪 Pruebas
- ❌ Pruebas backend (Pytest + DRF tests)
- ❌ Pruebas frontend (Vitest/RTL)
- ❌ Cobertura de pruebas

### 🔧 Calidad de Código
- ❌ Linters configurados (ruff/flake8 para Python, eslint para TypeScript)
- ❌ Formateadores (black para Python, prettier para TypeScript)
- ❌ CI/CD con GitHub Actions
- ❌ ErrorBoundary en frontend

### 📝 Documentación
- ❌ Documentación de setup/instalación
- ❌ README completo del proyecto
- ⚠️ Documentación API existe (Swagger) pero podría mejorarse

### 🚀 Despliegue
- ❌ Configuración para producción
- ❌ Variables de entorno
- ❌ Base de datos PostgreSQL (actualmente SQLite)
- ❌ Despliegue en Railway/Render/Vercel

### 🎁 Extensiones Opcionales (Exoneración)
- ❌ Notificaciones en tiempo real (Django Channels + WebSockets)
- ❌ Integración de calendario (exportar .ics o vista mensual)
- ❌ Subida de archivos (S3/Cloudinary o mock)
- ❌ Recordatorios por correo (Celery + Redis)

### 🔒 Seguridad Adicional
- ❌ Rate limiting (DRF throttle)
- ❌ Validación más estricta de payloads
- ❌ Logs estructurados

### ♿ Accesibilidad
- ⚠️ Contraste mejorado (implementado en modo claro y oscuro)
- ❌ Labels ARIA
- ❌ Navegación por teclado completa

---

## 📈 PROGRESO GENERAL

### Requerimientos Funcionales: ~90% ✅
- Autenticación: ✅ 100%
- Tableros: ✅ 100%
- Listas: ✅ 100%
- Tarjetas: ⚠️ 80% (faltan adjuntos, algunos campos no visibles)
- Comentarios: ⚠️ 50% (backend completo, frontend no)
- Etiquetas: ⚠️ 50% (backend completo, frontend no)
- Checklist: ⚠️ 50% (backend completo, frontend no)
- Búsqueda/Filtros: ✅ 90%
- Permisos: ✅ 100%
- UX: ✅ 95% (sistema de temas completo, UI moderna y consistente)

### Requerimientos No Funcionales: ~30% ⚠️
- Seguridad: ⚠️ 60% (JWT ✅, CORS ✅, rate-limit ❌)
- Calidad: ❌ 0% (linters, formateadores)
- Pruebas: ❌ 0%
- CI: ❌ 0%
- Observabilidad: ⚠️ 30% (logs básicos, sin ErrorBoundary)
- Accesibilidad: ⚠️ 20%

### Extensiones Opcionales: 0% ❌

---

## 🎯 PRIORIDADES RECOMENDADAS

### Alta Prioridad (Para completar funcionalidad básica)
1. ✅ **Completado:** Funcionalidad core del Kanban
2. ⚠️ **Pendiente:** Implementar adjuntos en tarjetas (link o mock)
3. ⚠️ **Pendiente:** Vista de historial de actividades
4. ⚠️ **Pendiente:** `PATCH /api/me/` funcional

### Media Prioridad (Para calidad)
1. ❌ Configurar linters y formateadores
2. ❌ Agregar pruebas básicas (backend y frontend)
3. ❌ ErrorBoundary en frontend
4. ❌ README con instrucciones de setup

### Baja Prioridad (Para producción)
1. ❌ CI/CD con GitHub Actions
2. ❌ Migración a PostgreSQL
3. ❌ Configuración para despliegue
4. ❌ Rate limiting

### Opcional (Exoneración)
1. ❌ Notificaciones en tiempo real
2. ❌ Calendario
3. ❌ Subida de archivos
4. ❌ Recordatorios por correo

---

## 📝 NOTAS

- El modal de tarjeta fue simplificado por solicitud del usuario (solo muestra: nombre, prioridad, fecha límite, responsables)
- Los endpoints de comentarios, checklist y etiquetas están implementados pero no se usan en la UI actual
- La base de datos actual es SQLite (debería migrarse a PostgreSQL para producción)
- El proyecto tiene buena base funcional, falta principalmente calidad de código y pruebas
- Sistema de temas implementado con Zustand para persistencia y `data-theme` attribute para CSS-driven styling
- Imagen de fondo configurable desde `frontend/src/config/background.ts`
- Removidas columnas `first_name` y `last_name` de `auth_user` - migración personalizada creada (0006_remove_user_first_last_name.py)
- Scripts SQL y comando Django (`crear_usuarios_prueba`) disponibles para seeding de usuarios de prueba

