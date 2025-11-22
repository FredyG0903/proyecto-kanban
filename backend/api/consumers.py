import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings


class NotificationConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		# Obtener token de query string
		query_string = self.scope.get('query_string', b'').decode()
		token = None
		if 'token=' in query_string:
			token = query_string.split('token=')[-1].split('&')[0]
		
		if not token:
			await self.close()
			return
		
		# Autenticar usuario por token JWT
		try:
			UntypedToken(token)
			decoded_data = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
			user_id = decoded_data.get('user_id')
			
			if not user_id:
				await self.close()
				return
			
			# Obtener usuario
			self.user = await self.get_user(user_id)
			
			if not self.user or not self.user.is_authenticated:
				await self.close()
				return
			
			# Unirse al grupo de notificaciones del usuario
			self.group_name = f"notifications_user_{self.user.id}"
			await self.channel_layer.group_add(
				self.group_name,
				self.channel_name
			)
			await self.accept()
		except (InvalidToken, TokenError, Exception) as e:
			print(f"Error de autenticación WebSocket: {e}")
			await self.close()

	async def disconnect(self, close_code):
		# Salir del grupo
		if hasattr(self, 'group_name'):
			await self.channel_layer.group_discard(
				self.group_name,
				self.channel_name
			)

	async def receive(self, text_data):
		# El cliente puede enviar mensajes (ej: marcar como leída)
		try:
			data = json.loads(text_data)
			if data.get('type') == 'mark_read':
				notification_id = data.get('notification_id')
				if notification_id:
					await self.mark_notification_read(notification_id)
		except json.JSONDecodeError:
			pass

	async def send_notification(self, event):
		# Enviar notificación al cliente
		await self.send(text_data=json.dumps({
			'type': 'notification',
			'data': event['data']
		}))

	@database_sync_to_async
	def get_user(self, user_id):
		try:
			return User.objects.get(id=user_id)
		except User.DoesNotExist:
			return None

	@database_sync_to_async
	def mark_notification_read(self, notification_id):
		from .models import Notification
		try:
			notification = Notification.objects.get(id=notification_id, recipient=self.user)
			notification.read = True
			notification.save()
		except Notification.DoesNotExist:
			pass

