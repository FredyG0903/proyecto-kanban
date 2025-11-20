"""
Comando de Django para crear usuarios de prueba.
Uso: python manage.py crear_usuarios_prueba
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from api.models import Profile

# Contraseña por defecto
PASSWORD = 'password123'

# Datos de usuarios
USUARIOS = [
    # Docentes
    {'username': 'prof.martinez', 'email': 'prof.martinez@escuela.edu', 'role': 'teacher', 'id_number': '1234567890'},
    {'username': 'prof.garcia', 'email': 'prof.garcia@escuela.edu', 'role': 'teacher', 'id_number': '2345678901'},
    {'username': 'prof.rodriguez', 'email': 'prof.rodriguez@escuela.edu', 'role': 'teacher', 'id_number': '3456789012'},
    {'username': 'prof.lopez', 'email': 'prof.lopez@escuela.edu', 'role': 'teacher', 'id_number': '4567890123'},
    {'username': 'prof.fernandez', 'email': 'prof.fernandez@escuela.edu', 'role': 'teacher', 'id_number': '5678901234'},
    
    # Estudiantes
    {'username': 'est.juan.perez', 'email': 'juan.perez@estudiante.edu', 'role': 'student', 'id_number': '6789012345'},
    {'username': 'est.maria.gonzalez', 'email': 'maria.gonzalez@estudiante.edu', 'role': 'student', 'id_number': '7890123456'},
    {'username': 'est.carlos.ramirez', 'email': 'carlos.ramirez@estudiante.edu', 'role': 'student', 'id_number': '8901234567'},
    {'username': 'est.ana.torres', 'email': 'ana.torres@estudiante.edu', 'role': 'student', 'id_number': '9012345678'},
    {'username': 'est.pedro.morales', 'email': 'pedro.morales@estudiante.edu', 'role': 'student', 'id_number': '0123456789'},
    {'username': 'est.laura.jimenez', 'email': 'laura.jimenez@estudiante.edu', 'role': 'student', 'id_number': '1122334455'},
    {'username': 'est.diego.castro', 'email': 'diego.castro@estudiante.edu', 'role': 'student', 'id_number': '2233445566'},
    {'username': 'est.sofia.ruiz', 'email': 'sofia.ruiz@estudiante.edu', 'role': 'student', 'id_number': '3344556677'},
    {'username': 'est.andres.vargas', 'email': 'andres.vargas@estudiante.edu', 'role': 'student', 'id_number': '4455667788'},
    {'username': 'est.valentina.mendoza', 'email': 'valentina.mendoza@estudiante.edu', 'role': 'student', 'id_number': '5566778899'},
    {'username': 'est.ricardo.herrera', 'email': 'ricardo.herrera@estudiante.edu', 'role': 'student', 'id_number': '6677889900'},
    {'username': 'est.camila.ortega', 'email': 'camila.ortega@estudiante.edu', 'role': 'student', 'id_number': '7788990011'},
    {'username': 'est.sebastian.delgado', 'email': 'sebastian.delgado@estudiante.edu', 'role': 'student', 'id_number': '8899001122'},
    {'username': 'est.isabella.silva', 'email': 'isabella.silva@estudiante.edu', 'role': 'student', 'id_number': '9900112233'},
    {'username': 'est.mateo.gutierrez', 'email': 'mateo.gutierrez@estudiante.edu', 'role': 'student', 'id_number': '0011223344'},
    {'username': 'est.alejandro.moreno', 'email': 'alejandro.moreno@estudiante.edu', 'role': 'student', 'id_number': '1357924680'},
    {'username': 'est.fernanda.cruz', 'email': 'fernanda.cruz@estudiante.edu', 'role': 'student', 'id_number': '2468135790'},
    {'username': 'est.rodrigo.medina', 'email': 'rodrigo.medina@estudiante.edu', 'role': 'student', 'id_number': '3579246801'},
    {'username': 'est.natalia.rios', 'email': 'natalia.rios@estudiante.edu', 'role': 'student', 'id_number': '4680357912'},
    {'username': 'est.manuel.suarez', 'email': 'manuel.suarez@estudiante.edu', 'role': 'student', 'id_number': '5791468023'},
    {'username': 'est.gabriela.mendez', 'email': 'gabriela.mendez@estudiante.edu', 'role': 'student', 'id_number': '6802579134'},
    {'username': 'est.oscar.contreras', 'email': 'oscar.contreras@estudiante.edu', 'role': 'student', 'id_number': '7913680245'},
    {'username': 'est.daniela.villa', 'email': 'daniela.villa@estudiante.edu', 'role': 'student', 'id_number': '8024791356'},
]


class Command(BaseCommand):
    help = 'Crea usuarios de prueba (docentes y estudiantes)'

    def handle(self, *args, **options):
        creados = 0
        existentes = 0
        errores = []
        
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('CREANDO USUARIOS DE PRUEBA'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'Contraseña por defecto para todos: {PASSWORD}\n')
        
        for datos in USUARIOS:
            username = datos['username']
            
            if User.objects.filter(username=username).exists():
                self.stdout.write(self.style.WARNING(f'⚠ {username} - Ya existe, omitiendo...'))
                existentes += 1
                continue
            
            try:
                # Verificar si el id_number ya existe
                if Profile.objects.filter(id_number=datos['id_number']).exists():
                    self.stdout.write(self.style.WARNING(f'⚠ {username} - ID {datos["id_number"]} ya existe, omitiendo...'))
                    existentes += 1
                    continue
                
                user = User.objects.create_user(
                    username=username,
                    email=datos['email'],
                    password=PASSWORD,
                    is_staff=False,
                    is_active=True,
                    is_superuser=False
                )
                
                Profile.objects.create(
                    user=user,
                    role=datos['role'],
                    id_number=datos['id_number']
                )
                
                self.stdout.write(self.style.SUCCESS(f'✓ {username} ({datos["role"]}) - Creado exitosamente'))
                creados += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ {username} - Error: {str(e)}'))
                errores.append((username, str(e)))
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('RESUMEN'))
        self.stdout.write('=' * 60)
        self.stdout.write(f'Usuarios creados: {creados}')
        self.stdout.write(f'Usuarios existentes (omitidos): {existentes}')
        self.stdout.write(f'Errores: {len(errores)}')
        
        if errores:
            self.stdout.write('\nErrores encontrados:')
            for username, error in errores:
                self.stdout.write(self.style.ERROR(f'  - {username}: {error}'))
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('CREDENCIALES DE ACCESO'))
        self.stdout.write('=' * 60)
        self.stdout.write(f'Todos los usuarios pueden iniciar sesión con:')
        self.stdout.write(f'  Contraseña: {PASSWORD}')
        self.stdout.write('\nEjemplos:')
        self.stdout.write(f'  Docente: prof.martinez / {PASSWORD}')
        self.stdout.write(f'  Estudiante: est.juan.perez / {PASSWORD}')
        self.stdout.write('=' * 60)

