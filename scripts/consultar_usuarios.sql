-- Consulta para obtener usuario, rol e id_number de auth_user y api_profile
-- Usando INNER JOIN

SELECT 
    u.id,
    u.username,
    u.email,
    p.role,
    p.id_number,
    u.date_joined
FROM auth_user u
INNER JOIN api_profile p ON u.id = p.user_id
ORDER BY p.role, u.username;

-- Si solo quieres los campos específicos que mencionaste:
SELECT 
    u.username,
    p.role,
    p.id_number
FROM auth_user u
INNER JOIN api_profile p ON u.id = p.user_id
ORDER BY p.role, u.username;

-- Para filtrar solo estudiantes:
SELECT 
    u.username,
    p.role,
    p.id_number
FROM auth_user u
INNER JOIN api_profile p ON u.id = p.user_id
WHERE p.role = 'student'
ORDER BY u.username;

-- Para filtrar solo docentes:
SELECT 
    u.username,
    p.role,
    p.id_number
FROM auth_user u
INNER JOIN api_profile p ON u.id = p.user_id
WHERE p.role = 'teacher'
ORDER BY u.username;

