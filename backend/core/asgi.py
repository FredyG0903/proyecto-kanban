"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Configurar Django primero
django_asgi_app = get_asgi_application()

# Importar routing después de que Django esté configurado
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
import api.routing

application = ProtocolTypeRouter({
	"http": django_asgi_app,
	"websocket": AllowedHostsOriginValidator(
		AuthMiddlewareStack(
			URLRouter(api.routing.websocket_urlpatterns)
		)
	),
})
