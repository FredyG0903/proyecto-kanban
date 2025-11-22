# Notificaciones Push - Guía de Configuración

## ¿Qué son las Notificaciones Push?

Las notificaciones push son notificaciones del sistema del navegador que aparecen incluso cuando:
- La aplicación está en otra pestaña
- La aplicación está minimizada
- El navegador está en segundo plano

Estas notificaciones complementan las notificaciones en tiempo real que ya funcionan dentro de la aplicación.

## Requisitos

1. **Navegador compatible**: Chrome, Firefox, Edge (Safari tiene soporte limitado)
2. **HTTPS en producción**: Las notificaciones push requieren HTTPS (excepto en localhost)
3. **Claves VAPID**: Par de claves criptográficas para autenticar las notificaciones

## Configuración del Backend

### 1. Instalar dependencias

```bash
cd backend
pip install -r requirements.txt
```

Esto instalará `pywebpush` y `py-vapid`.

### 2. Generar claves VAPID

Ejecuta el script de generación:

```bash
python generate_vapid_keys.py
```

Esto generará un par de claves (pública y privada). **Guarda estas claves de forma segura**.

### 3. Configurar las claves

Tienes dos opciones:

#### Opción A: Variables de entorno (Recomendado para producción)

Crea o edita un archivo `.env` en la carpeta `backend/`:

```env
VAPID_PUBLIC_KEY=tu_clave_publica_aqui
VAPID_PRIVATE_KEY=tu_clave_privada_aqui
VAPID_ADMIN_EMAIL=admin@kanban-academico.com
```

#### Opción B: Directamente en settings.py (Solo para desarrollo)

Edita `backend/core/settings.py` y reemplaza las líneas:

```python
VAPID_PUBLIC_KEY = os.getenv('VAPID_PUBLIC_KEY', 'tu_clave_publica_aqui')
VAPID_PRIVATE_KEY = os.getenv('VAPID_PRIVATE_KEY', 'tu_clave_privada_aqui')
VAPID_ADMIN_EMAIL = os.getenv('VAPID_ADMIN_EMAIL', 'admin@kanban-academico.com')
```

### 4. Ejecutar migraciones

```bash
python manage.py makemigrations
python manage.py migrate
```

Esto creará la tabla `PushSubscription` en la base de datos.

## Configuración del Frontend

El frontend ya está configurado para:
- Registrar automáticamente el Service Worker
- Solicitar permisos de notificación cuando el usuario inicia sesión
- Suscribirse a notificaciones push automáticamente

### Service Worker

El Service Worker está en `frontend/public/sw.js` y se registra automáticamente.

## Cómo Funciona

1. **Al iniciar sesión**: 
   - El sistema verifica si el navegador soporta notificaciones push
   - Si es compatible, solicita permisos al usuario
   - Si el usuario acepta, se crea una suscripción push
   - La suscripción se guarda en el backend

2. **Cuando ocurre un evento** (ej: un estudiante mueve una tarjeta):
   - Se crea una notificación en la base de datos
   - Se envía vía WebSocket (para notificaciones en tiempo real dentro de la app)
   - Se envía como notificación push (para notificaciones del sistema)

3. **El usuario recibe la notificación**:
   - Si la app está abierta: aparece en el dropdown de notificaciones
   - Si la app está cerrada: aparece como notificación del sistema
   - Al hacer clic en la notificación, se abre la app y navega al tablero relevante

## Pruebas

### En desarrollo (localhost)

Las notificaciones push funcionan en localhost sin HTTPS.

1. Inicia el backend y frontend
2. Inicia sesión en la aplicación
3. Acepta los permisos de notificación cuando se soliciten
4. Abre otra pestaña o minimiza el navegador
5. En otra sesión (otro navegador o modo incógnito), realiza una acción que genere una notificación
6. Deberías ver la notificación del sistema aparecer

### En producción

1. Asegúrate de que tu sitio esté servido por HTTPS
2. Configura las claves VAPID en las variables de entorno del servidor
3. Las notificaciones funcionarán igual que en desarrollo

## Solución de Problemas

### "No se pudo obtener la clave pública VAPID"

- Verifica que las claves VAPID estén configuradas en `settings.py` o variables de entorno
- Asegúrate de que el backend esté corriendo

### "Permisos de notificación denegados"

- El usuario debe aceptar los permisos manualmente en la configuración del navegador
- En Chrome: Configuración > Privacidad y seguridad > Notificaciones del sitio

### "Service Worker no se registra"

- Verifica que el archivo `sw.js` esté en `frontend/public/`
- Abre las herramientas de desarrollador > Application > Service Workers para ver errores

### Las notificaciones no aparecen

- Verifica que el usuario tenga permisos de notificación concedidos
- Revisa la consola del navegador para errores
- Verifica que las claves VAPID estén correctamente configuradas

## Seguridad

- **Nunca compartas la clave privada VAPID** públicamente
- Usa variables de entorno en producción
- La clave pública puede compartirse (se envía al frontend)

## Notas Adicionales

- Cada dispositivo/navegador del usuario tendrá su propia suscripción
- Si un usuario desinstala la app o revoca permisos, las suscripciones inválidas se eliminan automáticamente
- Las notificaciones push funcionan incluso si el usuario no está en la aplicación

