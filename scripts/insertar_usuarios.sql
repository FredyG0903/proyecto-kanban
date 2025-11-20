-- Script SQL para insertar usuarios de prueba en DBeaver
-- IMPORTANTE: Después de ejecutar este script, ejecuta:
-- python manage.py shell -c "from django.contrib.auth.models import User; from django.contrib.auth.hashers import make_password; [u.set_password('password123') or u.save() for u in User.objects.filter(username__startswith='prof.').union(User.objects.filter(username__startswith='est.'))]"
-- O mejor: python manage.py crear_usuarios_prueba (este comando ya crea usuarios con contraseñas)

-- ============================================
-- DOCENTES (TEACHERS)
-- ============================================

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('prof.martinez', 'prof.martinez@escuela.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'prof.martinez'), 'teacher', '1234567890');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('prof.garcia', 'prof.garcia@escuela.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'prof.garcia'), 'teacher', '2345678901');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('prof.rodriguez', 'prof.rodriguez@escuela.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'prof.rodriguez'), 'teacher', '3456789012');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('prof.lopez', 'prof.lopez@escuela.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'prof.lopez'), 'teacher', '4567890123');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('prof.fernandez', 'prof.fernandez@escuela.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'prof.fernandez'), 'teacher', '5678901234');

-- ============================================
-- ESTUDIANTES (STUDENTS)
-- ============================================

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.juan.perez', 'juan.perez@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.juan.perez'), 'student', '6789012345');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.maria.gonzalez', 'maria.gonzalez@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.maria.gonzalez'), 'student', '7890123456');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.carlos.ramirez', 'carlos.ramirez@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.carlos.ramirez'), 'student', '8901234567');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.ana.torres', 'ana.torres@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.ana.torres'), 'student', '9012345678');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.pedro.morales', 'pedro.morales@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.pedro.morales'), 'student', '0123456789');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.laura.jimenez', 'laura.jimenez@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.laura.jimenez'), 'student', '1122334455');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.diego.castro', 'diego.castro@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.diego.castro'), 'student', '2233445566');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.sofia.ruiz', 'sofia.ruiz@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.sofia.ruiz'), 'student', '3344556677');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.andres.vargas', 'andres.vargas@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.andres.vargas'), 'student', '4455667788');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.valentina.mendoza', 'valentina.mendoza@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.valentina.mendoza'), 'student', '5566778899');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.ricardo.herrera', 'ricardo.herrera@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.ricardo.herrera'), 'student', '6677889900');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.camila.ortega', 'camila.ortega@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.camila.ortega'), 'student', '7788990011');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.sebastian.delgado', 'sebastian.delgado@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.sebastian.delgado'), 'student', '8899001122');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.isabella.silva', 'isabella.silva@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.isabella.silva'), 'student', '9900112233');

INSERT INTO auth_user (username, email, password, is_staff, is_active, is_superuser, date_joined)
VALUES ('est.mateo.gutierrez', 'mateo.gutierrez@estudiante.edu', 'pbkdf2_sha256$870000$placeholder$placeholder', 0, 1, 0, datetime('now'));

INSERT INTO api_profile (user_id, role, id_number)
VALUES ((SELECT id FROM auth_user WHERE username = 'est.mateo.gutierrez'), 'student', '0011223344');

