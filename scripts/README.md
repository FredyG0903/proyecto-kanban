# Crear Usuarios de Prueba

## Método 1: Comando de Django (Recomendado)

```powershell
cd kanban-academico\backend
python manage.py crear_usuarios_prueba
```

## Método 2: Script SQL en DBeaver

1. Abre DBeaver y conéctate a `db.sqlite3`
2. Abre el archivo `scripts/insertar_usuarios.sql`
3. Ejecuta el script completo
4. **Importante:** Las contraseñas necesitan ser hasheadas. Ejecuta después:
   ```powershell
   python manage.py crear_usuarios_prueba
   ```
   (Este comando actualizará las contraseñas de los usuarios existentes)

## Usuarios Creados

### Docentes (5)
- `prof.martinez` / `password123`
- `prof.garcia` / `password123`
- `prof.rodriguez` / `password123`
- `prof.lopez` / `password123`
- `prof.fernandez` / `password123`

### Estudiantes (25)
- `est.juan.perez` / `password123`
- `est.maria.gonzalez` / `password123`
- `est.carlos.ramirez` / `password123`
- `est.ana.torres` / `password123`
- `est.pedro.morales` / `password123`
- `est.laura.jimenez` / `password123`
- `est.diego.castro` / `password123`
- `est.sofia.ruiz` / `password123`
- `est.andres.vargas` / `password123`
- `est.valentina.mendoza` / `password123`
- `est.ricardo.herrera` / `password123`
- `est.camila.ortega` / `password123`
- `est.sebastian.delgado` / `password123`
- `est.isabella.silva` / `password123`
- `est.mateo.gutierrez` / `password123`
- `est.alejandro.moreno` / `password123`
- `est.fernanda.cruz` / `password123`
- `est.rodrigo.medina` / `password123`
- `est.natalia.rios` / `password123`
- `est.manuel.suarez` / `password123`
- `est.gabriela.mendez` / `password123`
- `est.oscar.contreras` / `password123`
- `est.daniela.villa` / `password123`

**Contraseña por defecto:** `password123`
