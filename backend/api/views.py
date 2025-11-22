from django.contrib.auth.models import User
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, decorators
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q
from datetime import date, timedelta

from .models import Board, List, Card, Profile, Label, Comment, ChecklistItem, ActivityLog, Notification, PushSubscription
from .serializers import (
	BoardSerializer,
	ListSerializer,
	CardSerializer,
	LabelSerializer,
	CommentSerializer,
	ChecklistItemSerializer,
	ActivityLogSerializer,
	NotificationSerializer,
	PushSubscriptionSerializer,
)


class RegisterSerializer(serializers.ModelSerializer):
	password = serializers.CharField(write_only=True, min_length=8)
	role = serializers.ChoiceField(choices=Profile.Role.choices, write_only=True, required=True)
	id_number = serializers.CharField(write_only=True, required=True, min_length=10, max_length=10)
	email = serializers.EmailField(required=True)

	class Meta:
		model = User
		fields = ("username", "email", "password", "role", "id_number")

	def validate_id_number(self, value):
		# Validar que sea exactamente 10 dígitos numéricos
		if not value.isdigit():
			raise serializers.ValidationError("El ID debe contener solo números")
		if len(value) != 10:
			raise serializers.ValidationError("El ID debe tener exactamente 10 dígitos")
		# Verificar que no exista otro usuario con el mismo ID
		if Profile.objects.filter(id_number=value).exists():
			raise serializers.ValidationError("Ya existe un usuario con este ID")
		return value

	def create(self, validated_data):
		password = validated_data.pop("password")
		role = validated_data.pop("role")
		id_number = validated_data.pop("id_number")
		user = User(**validated_data)
		user.set_password(password)
		user.save()
		# Crear perfil con el rol e ID
		Profile.objects.create(user=user, role=role, id_number=id_number)
		return user


class RegisterView(APIView):
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		serializer = RegisterSerializer(data=request.data)
		if serializer.is_valid():
			user = serializer.save()
			return Response({"id": user.id, "username": user.username}, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeSerializer(serializers.ModelSerializer):
	role = serializers.SerializerMethodField()
	id_number = serializers.SerializerMethodField()

	class Meta:
		model = User
		fields = ("id", "username", "email", "is_staff", "is_superuser", "role", "id_number")
		read_only_fields = ("id", "username", "is_staff", "is_superuser", "role", "id_number")

	def get_role(self, obj):
		# Obtener el rol del perfil, si no existe retornar None
		try:
			return obj.profile.role
		except Profile.DoesNotExist:
			return None

	def get_id_number(self, obj):
		# Obtener el ID del perfil, si no existe retornar None
		try:
			return obj.profile.id_number
		except Profile.DoesNotExist:
			return None


class MeView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		return Response(MeSerializer(request.user).data)

	def patch(self, request):
		serializer = MeSerializer(instance=request.user, data=request.data, partial=True)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IsBoardMember(permissions.BasePermission):
	def has_object_permission(self, request, view, obj: Board):
		return request.user == obj.owner or obj.members.filter(id=request.user.id).exists()


# Helper function para crear activity logs
def create_activity_log(board, actor, action, meta=None):
	ActivityLog.objects.create(board=board, actor=actor, action=action, meta=meta or {})


# Helper function para enviar notificaciones en tiempo real
def send_notification_to_user(user_id, notification_data):
	"""
	Envía notificación en tiempo real a un usuario específico vía WebSocket
	y también como notificación push del navegador si el usuario tiene suscripciones.
	"""
	from channels.layers import get_channel_layer
	from asgiref.sync import async_to_sync
	
	# Enviar vía WebSocket (tiempo real en la app)
	channel_layer = get_channel_layer()
	if channel_layer:
		async_to_sync(channel_layer.group_send)(
			f"notifications_user_{user_id}",
			{
				'type': 'send_notification',
				'data': notification_data
			}
		)
	
	# Enviar notificación push del navegador (si está disponible)
	try:
		send_push_notification_to_user(user_id, notification_data)
	except Exception as e:
		# Si hay algún error con push notifications, no fallar la notificación principal
		print(f"Error al enviar push notification (no crítico): {e}")


def send_push_notification_to_user(user_id, notification_data):
	"""
	Envía notificación push del navegador a todas las suscripciones del usuario.
	"""
	try:
		from django.conf import settings
		from pywebpush import webpush, WebPushException
		import json
	except ImportError as e:
		# Si pywebpush no está instalado, simplemente no enviar push notifications
		print(f"pywebpush no está disponible: {e}")
		return
	
	# Verificar que las claves VAPID estén configuradas
	if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
		return  # No se pueden enviar push sin claves VAPID
	
	try:
		subscriptions = PushSubscription.objects.filter(user_id=user_id)
		
		for subscription in subscriptions:
			try:
				subscription_info = {
					"endpoint": subscription.endpoint,
					"keys": {
						"p256dh": subscription.p256dh,
						"auth": subscription.auth
					}
				}
				
				vapid_claims = {
					"sub": f"mailto:{settings.VAPID_ADMIN_EMAIL}"
				}
				
				# Preparar el payload de la notificación
				payload = json.dumps({
					"title": notification_data.get("title", "Nueva notificación"),
					"body": notification_data.get("message", ""),
					"icon": "/icon-192x192.png",  # Icono de la app (opcional)
					"badge": "/icon-192x192.png",
					"data": {
						"notification_id": notification_data.get("id"),
						"board_id": notification_data.get("board_id"),
						"type": notification_data.get("type", "notification")
					}
				})
				
				webpush(
					subscription_info=subscription_info,
					data=payload,
					vapid_private_key=settings.VAPID_PRIVATE_KEY,
					vapid_claims=vapid_claims
				)
			except WebPushException as e:
				# Si la suscripción es inválida (usuario desinstaló, etc.), eliminarla
				if e.response and e.response.status_code in [410, 404]:
					subscription.delete()
				else:
					print(f"Error al enviar push notification: {e}")
			except Exception as e:
				print(f"Error inesperado al enviar push notification: {e}")
	except Exception as e:
		print(f"Error al obtener suscripciones push: {e}")


# Helper function para calcular prioridad automática basada en fechas
def calculate_auto_priority(card_due_date, board_due_date):
	"""
	Calcula la prioridad automática de una tarjeta basándose en qué tan cerca está
	la fecha límite de la tarjeta de la fecha límite del tablero.
	
	- Si la tarjeta está en el último 25% del tiempo restante: HIGH
	- Si está en el 25-50%: MED
	- Si está en el 50-100%: LOW
	"""
	if not card_due_date or not board_due_date:
		return Card.Priority.MED
	
	today = date.today()
	days_until_card = (card_due_date - today).days
	days_until_board = (board_due_date - today).days
	
	if days_until_board <= 0:
		# Si el tablero ya venció, todo es alta prioridad
		return Card.Priority.HIGH
	
	if days_until_card <= 0:
		# Si la tarjeta ya venció, es alta prioridad
		return Card.Priority.HIGH
	
	# Calcular qué porcentaje del tiempo restante representa la tarjeta
	percentage = (days_until_card / days_until_board) * 100
	
	if percentage <= 25:
		return Card.Priority.HIGH
	elif percentage <= 50:
		return Card.Priority.MED
	else:
		return Card.Priority.LOW


class BoardViewSet(viewsets.ModelViewSet):
	serializer_class = BoardSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		return Board.objects.filter(Q(owner=user) | Q(members=user)).distinct()

	def perform_create(self, serializer):
		board = serializer.save(owner=self.request.user)
		board.members.add(self.request.user)
		create_activity_log(board, self.request.user, "board_created", {"board_id": board.id, "board_name": board.name})
		
		# Notificar a estudiantes miembros cuando docente crea tablero
		try:
			owner_profile = board.owner.profile
			if owner_profile.role == Profile.Role.TEACHER:
				# Notificar a todos los miembros estudiantes
				for member in board.members.all():
					try:
						member_profile = member.profile
						if member_profile.role == Profile.Role.STUDENT:
							notification = Notification.objects.create(
								recipient=member,
								board=board,
								notification_type='board_created',
								title='Nuevo tablero creado',
								message=f"{board.owner.username} creó el tablero '{board.name}'",
								data={'board_id': board.id, 'board_name': board.name}
							)
							send_notification_to_user(member.id, {
								'id': notification.id,
								'type': 'board_created',
								'title': notification.title,
								'message': notification.message,
								'board_id': board.id,
								'created_at': notification.created_at.isoformat()
							})
					except Profile.DoesNotExist:
						continue
		except Profile.DoesNotExist:
			pass

	def perform_update(self, serializer):
		board = self.get_object()
		if board.owner != self.request.user:
			raise PermissionDenied("Sólo el propietario puede editar el tablero.")
		# Validar que solo docentes puedan editar la fecha límite
		if 'due_date' in serializer.validated_data:
			try:
				profile = board.owner.profile
				if profile.role != Profile.Role.TEACHER:
					raise PermissionDenied("Solo los docentes pueden editar la fecha límite del tablero.")
			except Profile.DoesNotExist:
				raise PermissionDenied("Solo los docentes pueden editar la fecha límite del tablero.")
		serializer.save()

	def perform_destroy(self, instance):
		if instance.owner != self.request.user:
			raise PermissionDenied("Sólo el propietario puede eliminar el tablero.")
		instance.delete()

	@decorators.action(detail=True, methods=["post"], url_path="members", permission_classes=[IsAuthenticated])
	def manage_members(self, request, pk=None):
		"""
		Agregar o quitar miembro: payload { \"user_id\": int, \"id_number\": str, \"username\": str, \"action\": \"add\"|\"remove\" }
		Puede buscar por user_id, id_number o username
		"""
		board = self.get_object()
		if board.owner != request.user and not request.user.is_staff:
			raise PermissionDenied("Sólo el propietario puede gestionar miembros.")
		user_id = request.data.get("user_id")
		id_number = request.data.get("id_number")
		username = request.data.get("username")
		action = request.data.get("action")
		
		if action not in ("add", "remove"):
			raise ValidationError({"detail": "action debe ser 'add' o 'remove'"})
		
		# Buscar usuario por user_id, id_number o username
		member = None
		if user_id:
			try:
				member = User.objects.get(id=user_id)
			except User.DoesNotExist:
				raise ValidationError({"detail": "Usuario no encontrado con ese ID"})
		elif id_number:
			try:
				profile = Profile.objects.get(id_number=id_number)
				member = profile.user
			except Profile.DoesNotExist:
				raise ValidationError({"detail": f"Usuario no encontrado con ID {id_number}"})
		elif username:
			try:
				member = User.objects.get(username=username)
			except User.DoesNotExist:
				raise ValidationError({"detail": f"Usuario no encontrado con username '{username}'"})
		else:
			raise ValidationError({"detail": "Debes proporcionar user_id, id_number o username"})
		
		if action == "add":
			# Evitar agregar al owner como miembro
			if member == board.owner:
				raise ValidationError({"detail": "El propietario del tablero ya es miembro automáticamente"})
			board.members.add(member)
			create_activity_log(board, request.user, "member_added", {"user_id": member.id, "username": member.username})
			
			# Notificar al estudiante invitado
			try:
				member_profile = member.profile
				if member_profile.role == Profile.Role.STUDENT:
					notification = Notification.objects.create(
						recipient=member,
						board=board,
						notification_type='member_invited',
						title='Invitación a tablero',
						message=f"{request.user.username} te invitó al tablero '{board.name}'",
						data={'board_id': board.id, 'board_name': board.name, 'inviter_username': request.user.username}
					)
					send_notification_to_user(member.id, {
						'id': notification.id,
						'type': 'member_invited',
						'title': notification.title,
						'message': notification.message,
						'board_id': board.id,
						'created_at': notification.created_at.isoformat()
					})
			except Profile.DoesNotExist:
				pass
		else:
			board.members.remove(member)
			create_activity_log(board, request.user, "member_removed", {"user_id": member.id, "username": member.username})
		return Response(BoardSerializer(board).data)

	@decorators.action(detail=True, methods=["get", "post"], url_path="lists", permission_classes=[IsAuthenticated])
	def board_lists(self, request, pk=None):
		board = self.get_object()
		if not (board.owner == request.user or board.members.filter(id=request.user.id).exists()):
			raise PermissionDenied("No eres miembro de este tablero.")
		if request.method == "GET":
			lists = List.objects.filter(board=board).order_by("position", "id")
			return Response(ListSerializer(lists, many=True).data)
		# POST para crear lista
		serializer = ListSerializer(data=request.data)
		if serializer.is_valid():
			new_list = List.objects.create(
				board=board,
				title=serializer.validated_data.get("title"),
				position=serializer.validated_data.get("position", 0),
			)
			create_activity_log(board, request.user, "list_created", {"list_id": new_list.id, "list_title": new_list.title})
			return Response(ListSerializer(new_list).data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ListViewSet(viewsets.GenericViewSet):
	queryset = List.objects.all()
	serializer_class = ListSerializer
	permission_classes = [IsAuthenticated]

	def get_object(self):
		obj = super().get_object()
		board = obj.board
		if not (board.owner == self.request.user or board.members.filter(id=self.request.user.id).exists()):
			raise PermissionDenied("No eres miembro de este tablero.")
		return obj

	@decorators.action(detail=True, methods=["get", "post"], url_path="cards")
	def list_cards(self, request, pk=None):
		lst = self.get_object()
		if request.method == "GET":
			cards = Card.objects.filter(list=lst).order_by("position", "id")
			return Response(CardSerializer(cards, many=True).data)
		# POST para crear tarjeta
		# Crear datos sin el campo 'list' ya que lo obtenemos de la lista actual
		data = dict(request.data)
		if 'list' in data:
			del data['list']
		serializer = CardSerializer(data=data)
		if serializer.is_valid():
			board = lst.board
			card_due_date = serializer.validated_data.get("due_date")
			
			# Validar que la fecha de la tarjeta no exceda la del tablero
			if card_due_date and board.due_date:
				if card_due_date > board.due_date:
					raise ValidationError({"due_date": f"La fecha límite de la tarjeta no puede ser posterior a la fecha límite del tablero ({board.due_date})"})
			
			# Calcular prioridad automática si no se proporciona
			priority = serializer.validated_data.get("priority")
			if not priority and card_due_date and board.due_date:
				priority = calculate_auto_priority(card_due_date, board.due_date)
			elif not priority:
				priority = Card.Priority.MED
			
			card = Card.objects.create(
				list=lst,
				title=serializer.validated_data["title"],
				description=serializer.validated_data.get("description", ""),
				due_date=card_due_date,
				priority=priority,
				position=serializer.validated_data.get("position", 0),
				created_by=request.user,
			)
			create_activity_log(lst.board, request.user, "card_created", {"card_id": card.id, "card_title": card.title, "list_id": lst.id})
			return Response(CardSerializer(card).data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	def partial_update(self, request, pk=None):
		lst = self.get_object()
		serializer = self.get_serializer(lst, data=request.data, partial=True)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	def destroy(self, request, pk=None):
		lst = self.get_object()
		# Sólo el owner del tablero puede borrar listas
		if lst.board.owner != request.user:
			raise PermissionDenied("Sólo el propietario del tablero puede eliminar listas.")
		board = lst.board
		list_title = lst.title
		lst.delete()
		create_activity_log(board, request.user, "list_deleted", {"list_title": list_title})
		return Response(status=status.HTTP_204_NO_CONTENT)


class CardViewSet(viewsets.GenericViewSet):
	queryset = Card.objects.select_related("list", "list__board", "created_by").all()
	serializer_class = CardSerializer
	permission_classes = [IsAuthenticated]

	def get_object(self):
		obj = super().get_object()
		board = obj.list.board
		if not (board.owner == self.request.user or board.members.filter(id=self.request.user.id).exists()):
			raise PermissionDenied("No eres miembro de este tablero.")
		return obj

	@decorators.action(detail=False, methods=["post"], url_path=r"lists/(?P<list_id>[^/.]+)/cards")
	def create_in_list(self, request, list_id=None):
		try:
			lst = List.objects.select_related("board").get(id=list_id)
		except List.DoesNotExist:
			raise ValidationError({"detail": "Lista no encontrada"})
		board = lst.board
		if not (board.owner == request.user or board.members.filter(id=request.user.id).exists()):
			raise PermissionDenied("No eres miembro de este tablero.")
		serializer = CardSerializer(data=request.data)
		if serializer.is_valid():
			card = Card.objects.create(
				list=lst,
				title=serializer.validated_data["title"],
				description=serializer.validated_data.get("description", ""),
				due_date=serializer.validated_data.get("due_date"),
				priority=serializer.validated_data.get("priority", Card.Priority.MED),
				position=serializer.validated_data.get("position", 0),
				created_by=request.user,
			)
			create_activity_log(board, request.user, "card_created", {"card_id": card.id, "card_title": card.title, "list_id": lst.id})
			
			# Notificar a estudiantes cuando docente crea tarjeta
			try:
				creator_profile = request.user.profile
				if creator_profile.role == Profile.Role.TEACHER:
					for member in board.members.all():
						try:
							member_profile = member.profile
							if member_profile.role == Profile.Role.STUDENT:
								notification = Notification.objects.create(
									recipient=member,
									board=board,
									notification_type='card_created',
									title='Nueva tarea creada',
									message=f"{request.user.username} creó la tarea '{card.title}' en el tablero '{board.name}'",
									data={'board_id': board.id, 'card_id': card.id, 'card_title': card.title, 'list_id': lst.id}
								)
								send_notification_to_user(member.id, {
									'id': notification.id,
									'type': 'card_created',
									'title': notification.title,
									'message': notification.message,
									'board_id': board.id,
									'card_id': card.id,
									'created_at': notification.created_at.isoformat()
								})
						except Profile.DoesNotExist:
							continue
			except Profile.DoesNotExist:
				pass
			
			return Response(CardSerializer(card).data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	def retrieve(self, request, pk=None):
		card = self.get_object()
		return Response(self.get_serializer(card).data)

	def partial_update(self, request, pk=None):
		try:
			card = self.get_object()
			data = request.data.copy()
			board = card.list.board
		except Exception as e:
			import traceback
			print(f"Error en get_object o data copy: {e}")
			traceback.print_exc()
			raise
		
		# Validar que solo docentes puedan editar fechas
		if "due_date" in data or "priority" in data:
			try:
				profile = request.user.profile
				if profile.role != Profile.Role.TEACHER and board.owner != request.user:
					raise PermissionDenied("Solo los docentes pueden editar fechas límite y prioridades de las tareas.")
			except Profile.DoesNotExist:
				if board.owner != request.user:
					raise PermissionDenied("Solo los docentes pueden editar fechas límite y prioridades de las tareas.")
		
		# Validar que la fecha de la tarjeta no exceda la del tablero
		if "due_date" in data and data.get("due_date"):
			card_due_date = data.get("due_date")
			if isinstance(card_due_date, str):
				from datetime import datetime
				card_due_date = datetime.strptime(card_due_date, "%Y-%m-%d").date()
			
			if board.due_date and card_due_date > board.due_date:
				raise ValidationError({"due_date": f"La fecha límite de la tarjeta no puede ser posterior a la fecha límite del tablero ({board.due_date})"})
			
			# Recalcular prioridad automática si se cambia la fecha
			if not data.get("priority") and board.due_date:
				data["priority"] = calculate_auto_priority(card_due_date, board.due_date)
		
		# mover entre listas mediante list_id + position
		old_list = card.list
		new_list_id = data.get("list_id")
		if new_list_id is not None:
			# Convertir a entero si viene como string
			try:
				new_list_id = int(new_list_id)
			except (TypeError, ValueError):
				raise ValidationError({"detail": "list_id debe ser un número válido"})
			
			try:
				new_list = List.objects.select_related("board").get(id=new_list_id)
			except List.DoesNotExist:
				raise ValidationError({"detail": "La lista destino no existe"})
			
			# validar membresía al tablero destino
			new_board = new_list.board
			if not (new_board.owner == request.user or new_board.members.filter(id=request.user.id).exists()):
				raise PermissionDenied("No eres miembro del tablero destino.")
			if old_list.id != new_list.id:
				create_activity_log(
					new_board,
					request.user,
					"card_moved",
					{"card_id": card.id, "card_title": card.title, "from_list": old_list.title, "to_list": new_list.title},
				)
				
				# Notificar a docente cuando estudiante mueve tarjeta
				try:
					actor_profile = request.user.profile
					owner_profile = new_board.owner.profile
					if actor_profile.role == Profile.Role.STUDENT and owner_profile.role == Profile.Role.TEACHER:
						notification = Notification.objects.create(
							recipient=new_board.owner,
							board=new_board,
							notification_type='card_moved',
							title='Tarjeta movida',
							message=f"{request.user.username} movió '{card.title}' de '{old_list.title}' a '{new_list.title}'",
							data={
								'card_id': card.id,
								'card_title': card.title,
								'from_list': old_list.title,
								'to_list': new_list.title,
								'actor_username': request.user.username
							}
						)
						send_notification_to_user(new_board.owner.id, {
							'id': notification.id,
							'type': 'card_moved',
							'title': notification.title,
							'message': notification.message,
							'board_id': new_board.id,
							'card_id': card.id,
							'created_at': notification.created_at.isoformat()
						})
				except Profile.DoesNotExist:
					pass
				
			card.list = new_list
		if "position" in data:
			try:
				card.position = int(data.get("position"))
			except (TypeError, ValueError):
				raise ValidationError({"detail": "position debe ser numérico"})
		
		# Guardar los cambios manuales (list y position)
		try:
			card.save()
		except Exception as e:
			import traceback
			print(f"Error al guardar la tarjeta: {e}")
			traceback.print_exc()
			raise ValidationError({"detail": f"Error al guardar la tarjeta: {str(e)}"})
		
		# Refrescar el objeto desde la base de datos para asegurar que tenemos los datos más recientes
		try:
			card.refresh_from_db()
		except Exception as e:
			print(f"Advertencia: No se pudo refrescar la tarjeta desde la BD: {e}")
		
		# Serializar y devolver la tarjeta actualizada
		try:
			serializer = self.get_serializer(card)
			return Response(serializer.data)
		except Exception as e:
			import traceback
			print(f"Error al serializar la tarjeta: {e}")
			traceback.print_exc()
			raise ValidationError({"detail": f"Error al serializar la tarjeta: {str(e)}"})

	def destroy(self, request, pk=None):
		card = self.get_object()
		# owner del tablero o creador de la tarjeta pueden borrar
		if not (card.list.board.owner == request.user or card.created_by == request.user):
			raise PermissionDenied("Sólo el propietario del tablero o creador pueden eliminar la tarjeta.")
		board = card.list.board
		card_title = card.title
		card.delete()
		create_activity_log(board, request.user, "card_deleted", {"card_title": card_title})
		return Response(status=status.HTTP_204_NO_CONTENT)

	@decorators.action(detail=True, methods=["post"], url_path="assignees")
	def manage_assignees(self, request, pk=None):
		card = self.get_object()
		user_id = request.data.get("user_id")
		action = request.data.get("action")
		if not user_id or action not in ("add", "remove"):
			raise ValidationError({"detail": "user_id y action son requeridos"})
		try:
			member = User.objects.get(id=user_id)
		except User.DoesNotExist:
			raise ValidationError({"detail": "Usuario no encontrado"})
		board = card.list.board
		if not (board.owner == request.user or board.members.filter(id=request.user.id).exists()):
			raise PermissionDenied("No eres miembro de este tablero.")
		if action == "add":
			card.assignees.add(member)
		else:
			card.assignees.remove(member)
		return Response(CardSerializer(card).data)


class CardsSearchView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		q = request.query_params.get("q", "").strip()
		assignee = request.query_params.get("assignee")
		due = request.query_params.get("due")
		user = request.user
		qs = Card.objects.filter(Q(list__board__owner=user) | Q(list__board__members=user)).distinct()
		if q:
			qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
		if assignee:
			qs = qs.filter(assignees__id=assignee)
		if due == "overdue":
			from django.utils.timezone import now
			qs = qs.filter(due_date__lt=now().date())
		elif due == "soon":
			from django.utils.timezone import now
			from datetime import timedelta
			qs = qs.filter(due_date__lte=now().date() + timedelta(days=7))
		data = CardSerializer(qs[:100], many=True).data
		return Response(data)


# Endpoints para comentarios
class CommentViewSet(viewsets.ModelViewSet):
	queryset = Comment.objects.all()
	serializer_class = CommentSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		card_id = self.request.query_params.get("card")
		if card_id:
			return Comment.objects.filter(card_id=card_id).select_related("author")
		return Comment.objects.none()

	def perform_create(self, serializer):
		card = serializer.validated_data["card"]
		board = card.list.board
		if not (board.owner == self.request.user or board.members.filter(id=self.request.user.id).exists()):
			raise PermissionDenied("No eres miembro de este tablero.")
		comment = serializer.save(author=self.request.user)
		create_activity_log(board, self.request.user, "comment_added", {"card_id": card.id, "comment_id": comment.id})


# Endpoints para checklist
class ChecklistItemViewSet(viewsets.ModelViewSet):
	queryset = ChecklistItem.objects.all()
	serializer_class = ChecklistItemSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		card_id = self.request.query_params.get("card")
		if card_id:
			return ChecklistItem.objects.filter(card_id=card_id)
		return ChecklistItem.objects.none()

	def perform_create(self, serializer):
		card = serializer.validated_data["card"]
		board = card.list.board
		if not (board.owner == self.request.user or board.members.filter(id=self.request.user.id).exists()):
			raise PermissionDenied("No eres miembro de este tablero.")
		serializer.save()

	def perform_update(self, serializer):
		item = self.get_object()
		board = item.card.list.board
		if not (board.owner == self.request.user or board.members.filter(id=self.request.user.id).exists()):
			raise PermissionDenied("No eres miembro de este tablero.")
		serializer.save()


# Endpoints para labels
class LabelViewSet(viewsets.ModelViewSet):
	queryset = Label.objects.all()
	serializer_class = LabelSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		board_id = self.request.query_params.get("board")
		if board_id:
			return Label.objects.filter(board_id=board_id)
		return Label.objects.none()

	def perform_create(self, serializer):
		board = serializer.validated_data["board"]
		if board.owner != self.request.user and not self.request.user.is_staff:
			raise PermissionDenied("Sólo el propietario puede crear etiquetas.")
		serializer.save()

	@decorators.action(detail=True, methods=["post"], url_path="cards")
	def manage_card_labels(self, request, pk=None):
		label = self.get_object()
		card_id = request.data.get("card_id")
		action = request.data.get("action")
		if not card_id or action not in ("add", "remove"):
			raise ValidationError({"detail": "card_id y action son requeridos"})
		try:
			card = Card.objects.get(id=card_id)
		except Card.DoesNotExist:
			raise ValidationError({"detail": "Tarjeta no encontrada"})
		board = card.list.board
		if not (board.owner == request.user or board.members.filter(id=request.user.id).exists()):
			raise PermissionDenied("No eres miembro de este tablero.")
		if action == "add":
			label.cards.add(card)
		else:
			label.cards.remove(card)
		return Response(CardSerializer(card).data)


# Endpoint para activity log
class ActivityLogView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, board_id):
		try:
			board = Board.objects.get(id=board_id)
		except Board.DoesNotExist:
			raise ValidationError({"detail": "Tablero no encontrado"})
		if not (board.owner == request.user or board.members.filter(id=request.user.id).exists()):
			raise PermissionDenied("No eres miembro de este tablero.")
		activities = ActivityLog.objects.filter(board=board).select_related("actor")[:50]
		return Response(ActivityLogSerializer(activities, many=True).data)


# ViewSet para notificaciones
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
	serializer_class = NotificationSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		# Solo notificaciones del usuario autenticado
		queryset = Notification.objects.filter(recipient=self.request.user)
		
		# Filtro opcional: ?unread=true
		unread = self.request.query_params.get('unread', None)
		if unread == 'true':
			queryset = queryset.filter(read=False)
		
		return queryset.order_by('-created_at')

	@decorators.action(detail=True, methods=['post'])
	def mark_read(self, request, pk=None):
		notification = self.get_object()
		if notification.recipient != request.user:
			raise PermissionDenied("No puedes marcar esta notificación como leída.")
		notification.read = True
		notification.save()
		return Response(NotificationSerializer(notification).data)

	@decorators.action(detail=False, methods=['post'])
	def mark_all_read(self, request):
		Notification.objects.filter(recipient=request.user, read=False).update(read=True)
		return Response({"message": "Todas las notificaciones han sido marcadas como leídas"})


# ViewSet para suscripciones push
class PushSubscriptionViewSet(viewsets.ModelViewSet):
	serializer_class = PushSubscriptionSerializer
	permission_classes = [IsAuthenticated]
	
	def get_queryset(self):
		# Solo las suscripciones del usuario autenticado
		return PushSubscription.objects.filter(user=self.request.user)
	
	def perform_create(self, serializer):
		# Asignar automáticamente el usuario actual
		serializer.save(user=self.request.user)
	
	@decorators.action(detail=False, methods=['get'])
	def public_key(self, request):
		"""
		Endpoint para obtener la clave pública VAPID que el frontend necesita
		para suscribirse a notificaciones push.
		"""
		from django.conf import settings
		return Response({
			"public_key": settings.VAPID_PUBLIC_KEY
		})
