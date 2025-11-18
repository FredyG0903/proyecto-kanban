from django.contrib.auth.models import User
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, decorators
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q

from .models import Board, List, Card, Profile, Label, Comment, ChecklistItem, ActivityLog
from .serializers import (
	BoardSerializer,
	ListSerializer,
	CardSerializer,
	LabelSerializer,
	CommentSerializer,
	ChecklistItemSerializer,
	ActivityLogSerializer,
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
		fields = ("id", "username", "email", "first_name", "last_name", "is_staff", "is_superuser", "role", "id_number")
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

	def perform_update(self, serializer):
		board = self.get_object()
		if board.owner != self.request.user:
			raise PermissionDenied("Sólo el propietario puede editar el tablero.")
		serializer.save()

	def perform_destroy(self, instance):
		if instance.owner != self.request.user:
			raise PermissionDenied("Sólo el propietario puede eliminar el tablero.")
		instance.delete()

	@decorators.action(detail=True, methods=["post"], url_path="members", permission_classes=[IsAuthenticated])
	def manage_members(self, request, pk=None):
		"""
		Agregar o quitar miembro: payload { \"user_id\": int, \"action\": \"add\"|\"remove\" }
		"""
		board = self.get_object()
		if board.owner != request.user and not request.user.is_staff:
			raise PermissionDenied("Sólo el propietario puede gestionar miembros.")
		user_id = request.data.get("user_id")
		action = request.data.get("action")
		if not user_id or action not in ("add", "remove"):
			raise ValidationError({"detail": "user_id y action son requeridos"})
		try:
			member = User.objects.get(id=user_id)
		except User.DoesNotExist:
			raise ValidationError({"detail": "Usuario no encontrado"})
		if action == "add":
			board.members.add(member)
			create_activity_log(board, request.user, "member_added", {"user_id": member.id, "username": member.username})
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

	@decorators.action(detail=True, methods=["get"], url_path="cards")
	def list_cards(self, request, pk=None):
		lst = self.get_object()
		cards = Card.objects.filter(list=lst).order_by("position", "id")
		return Response(CardSerializer(cards, many=True).data)

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
			return Response(CardSerializer(card).data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

	def retrieve(self, request, pk=None):
		card = self.get_object()
		return Response(self.get_serializer(card).data)

	def partial_update(self, request, pk=None):
		card = self.get_object()
		data = request.data.copy()
		# mover entre listas mediante list_id + position
		old_list = card.list
		new_list_id = data.get("list_id")
		if new_list_id is not None:
			try:
				new_list = List.objects.select_related("board").get(id=new_list_id)
			except List.DoesNotExist:
				raise ValidationError({"detail": "La lista destino no existe"})
			# validar membresía al tablero destino
			board = new_list.board
			if not (board.owner == request.user or board.members.filter(id=request.user.id).exists()):
				raise PermissionDenied("No eres miembro del tablero destino.")
			if old_list.id != new_list.id:
				create_activity_log(
					board,
					request.user,
					"card_moved",
					{"card_id": card.id, "card_title": card.title, "from_list": old_list.title, "to_list": new_list.title},
				)
			card.list = new_list
		if "position" in data:
			try:
				card.position = int(data.get("position"))
			except (TypeError, ValueError):
				raise ValidationError({"detail": "position debe ser numérico"})
		serializer = self.get_serializer(card, data=data, partial=True)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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


# Helper function para crear activity logs
def create_activity_log(board, actor, action, meta=None):
	ActivityLog.objects.create(board=board, actor=actor, action=action, meta=meta or {})


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
