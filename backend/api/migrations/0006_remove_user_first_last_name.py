# Generated migration to remove first_name and last_name from auth_user
# Note: SQLite no soporta DROP COLUMN directamente, así que esta migración
# solo documenta el cambio. Las columnas quedarán en la BD pero no se usarán.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_board_due_date'),
    ]

    operations = [
        # NOTA: SQLite no soporta ALTER TABLE DROP COLUMN directamente.
        # Las columnas first_name y last_name permanecerán en la base de datos
        # pero ya no se usarán en el código. Si necesitas eliminarlas físicamente,
        # tendrías que recrear la tabla o usar una herramienta externa.
        # 
        # Para PostgreSQL/MySQL, usarías:
        # migrations.RunSQL("ALTER TABLE auth_user DROP COLUMN first_name;")
        # migrations.RunSQL("ALTER TABLE auth_user DROP COLUMN last_name;")
        #
        # Por ahora, esta migración está vacía porque el código ya no usa estos campos.
    ]

