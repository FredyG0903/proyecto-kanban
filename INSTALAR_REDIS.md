# Instalación de Redis para Notificaciones en Tiempo Real

## ¿Por qué Redis?

Actualmente las notificaciones usan `InMemoryChannelLayer`, que:
- ❌ Solo funciona en memoria (se pierden al reiniciar el servidor)
- ❌ No funciona con múltiples instancias del servidor
- ❌ No es adecuado para producción

Redis permite:
- ✅ Persistencia de conexiones WebSocket
- ✅ Funciona con múltiples servidores
- ✅ Escalable y robusto
- ✅ Adecuado para producción

## Instalación en Windows

### Opción 1: Usando WSL (Recomendado)

Si tienes WSL (Windows Subsystem for Linux) instalado:

```bash
# En WSL
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### Opción 2: Usando Memurai (Redis para Windows)

1. Descarga Memurai desde: https://www.memurai.com/get-memurai
2. Instala el ejecutable
3. Memurai se ejecutará como servicio de Windows automáticamente

### Opción 3: Usando Docker (Recomendado si tienes Docker)

```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### Opción 4: Usando Chocolatey

```powershell
choco install redis-64
```

Luego inicia Redis:
```powershell
redis-server
```

## Verificar que Redis está funcionando

Abre una nueva terminal y ejecuta:

```bash
# Si usas WSL o Linux
redis-cli ping
# Debe responder: PONG

# Si usas Windows con Memurai
# Abre PowerShell y ejecuta:
redis-cli ping
```

## Configurar el proyecto para usar Redis

### Opción 1: Variable de entorno (Recomendado)

Crea o edita el archivo `.env` en `kanban-academico/backend/`:

```env
USE_REDIS=True
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Opción 2: Modificar directamente settings.py

Si no quieres usar variables de entorno, puedes cambiar manualmente en `core/settings.py`:

```python
USE_REDIS = True  # Cambiar de False a True
```

## Probar la configuración

1. Asegúrate de que Redis está corriendo
2. Reinicia el servidor Django:
   ```bash
   daphne -b 0.0.0.0 -p 8000 core.asgi:application
   ```
3. Deberías ver en la consola:
   ```
   ✅ Usando Redis para Channel Layers en 127.0.0.1:6379
   ```

## Solución de problemas

### Error: "Connection refused" o "Cannot connect to Redis"

- Verifica que Redis está corriendo:
  ```bash
  redis-cli ping
  ```
- Verifica que el puerto 6379 no está bloqueado por el firewall
- Verifica que `REDIS_HOST` y `REDIS_PORT` son correctos

### Error: "ModuleNotFoundError: No module named 'channels_redis'"

Instala las dependencias:
```bash
pip install channels-redis redis
```

### Redis no inicia en Windows

- Si usas Memurai, verifica que el servicio está corriendo:
  ```powershell
  Get-Service Memurai
  ```
- Si usas WSL, asegúrate de que el servicio está iniciado:
  ```bash
  sudo service redis-server start
  ```

## Notas importantes

- **Desarrollo local**: Puedes seguir usando `InMemoryChannelLayer` si solo trabajas localmente
- **Producción**: Siempre usa Redis
- **Múltiples usuarios**: Si varios usuarios usarán la app simultáneamente, Redis es necesario
- **Persistencia**: Con Redis, las notificaciones funcionan incluso si reinicias el servidor Django

## Comandos útiles

```bash
# Ver estado de Redis
redis-cli info

# Limpiar datos de Redis (cuidado, borra todo)
redis-cli FLUSHALL

# Ver conexiones activas
redis-cli CLIENT LIST

# Detener Redis (WSL/Linux)
sudo service redis-server stop

# Detener Redis (Docker)
docker stop redis
```

