# Instrucciones para Cambiar la Imagen de Fondo

## 📁 Dónde Colocar la Imagen

1. Coloca tu imagen en la carpeta: `frontend/public/`
   - Ejemplo: `frontend/public/background.jpg`
   - Formatos soportados: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`

## 🔧 Cómo Cambiar la Imagen (Método Fácil)

**Solo necesitas modificar UN archivo:**

### Archivo: `src/config/background.ts`

1. Abre el archivo `frontend/src/config/background.ts`
2. Busca la línea que dice:
   ```typescript
   export const BACKGROUND_IMAGE_URL = 'url(https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80)'
   ```
3. Cámbiala por:
   ```typescript
   export const BACKGROUND_IMAGE_URL = 'url(/nombre-de-tu-imagen.jpg)'
   ```

**Ejemplo:** Si tu imagen se llama `fondo.jpg` y está en `public/fondo.jpg`:
```typescript
export const BACKGROUND_IMAGE_URL = 'url(/fondo.jpg)'
```

## ⚠️ Importante

- La ruta debe comenzar con `/` (barra diagonal)
- No incluyas `public/` en la ruta
- El nombre del archivo debe coincidir exactamente (incluyendo mayúsculas/minúsculas)
- El cambio se aplicará automáticamente a todas las vistas (TeacherDashboard, StudentDashboard, BoardView, CardDetailView)

## 📋 Ejemplo Completo

1. Coloca tu imagen: `frontend/public/mi-fondo.jpg`
2. Abre: `frontend/src/config/background.ts`
3. Cambia a:
   ```typescript
   export const BACKGROUND_IMAGE_URL = 'url(/mi-fondo.jpg)'
   ```
4. ¡Listo! La imagen se aplicará en toda la aplicación.

## 🔄 Usar una URL Externa

Si prefieres usar una imagen desde internet, simplemente usa:
```typescript
export const BACKGROUND_IMAGE_URL = 'url(https://ejemplo.com/imagen.jpg)'
```

