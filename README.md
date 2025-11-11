# Kanban Académico\n\n## Requerimientos\n- Python 3.12+\n- Node 18/20+\n- Postgres 14+\n- Redis (opcional para websockets)\n\n## Backend (Django)\n`powershell
cd backend
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
`
\nAPI Docs: http://localhost:8000/api/docs/\n\n## Frontend (Vite React TS)\n`powershell
cd frontend
npm i
npm run dev
`
\n## Estructura\n`
kanban-academico/
  backend/
    core/  # settings, urls
    api/   # app principal
    manage.py
    requirements.txt
  frontend/
    src/
    vite.config.ts
    package.json
  docs/
  .github/workflows/ci.yml
`
\n## Próximos pasos
- Modelos y migraciones (User/Profile/Board/List/Card/Label/Comment/ChecklistItem/ActivityLog)
- Endpoints de autenticación (register/login/refresh) con simplejwt
- CRUD de boards, listas y tarjetas con permisos por rol
- Estado global en FE (Zustand) y rutas privadas\n- Drag & drop (opc) y notificaciones en tiempo real (Channels)

