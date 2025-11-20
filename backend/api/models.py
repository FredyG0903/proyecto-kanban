from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
	class Role(models.TextChoices):
		STUDENT = "student", "Estudiante"
		TEACHER = "teacher", "Docente"

	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
	role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
	id_number = models.CharField(max_length=10, unique=True, null=True, blank=True, help_text="ID de 10 dígitos")

	def __str__(self) -> str:
		return f"{self.user.username} ({self.get_role_display()})"


class Board(models.Model):
	name = models.CharField(max_length=200)
	owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_boards")
	members = models.ManyToManyField(User, related_name="boards", blank=True)
	color = models.CharField(max_length=20, blank=True, default="")
	due_date = models.DateField(null=True, blank=True, help_text="Fecha límite del proyecto/tablero")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self) -> str:
		return self.name


class List(models.Model):
	board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="lists")
	title = models.CharField(max_length=200)
	position = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ["position", "id"]

	def __str__(self) -> str:
		return f"{self.title} ({self.board.name})"


class Label(models.Model):
	board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="labels")
	name = models.CharField(max_length=50)
	color = models.CharField(max_length=20, default="#3b82f6")
	cards = models.ManyToManyField("Card", related_name="labels", blank=True)

	def __str__(self) -> str:
		return f"{self.name} ({self.board.name})"


class Card(models.Model):
	class Priority(models.TextChoices):
		LOW = "low", "Low"
		MED = "med", "Medium"
		HIGH = "high", "High"

	list = models.ForeignKey(List, on_delete=models.CASCADE, related_name="cards")
	title = models.CharField(max_length=255)
	description = models.TextField(blank=True, default="")
	due_date = models.DateField(null=True, blank=True)
	priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MED)
	position = models.PositiveIntegerField(default=0)
	created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_cards")
	assignees = models.ManyToManyField(User, related_name="assigned_cards", blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["position", "id"]

	def __str__(self) -> str:
		return self.title


class Comment(models.Model):
	card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name="comments")
	author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments")
	content = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self) -> str:
		return f"{self.author.username} - {self.card.title}"


class ChecklistItem(models.Model):
	card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name="checklist_items")
	text = models.CharField(max_length=255)
	done = models.BooleanField(default=False)
	position = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ["position", "id"]

	def __str__(self) -> str:
		return f"{self.text} ({'✓' if self.done else '○'})"


class ActivityLog(models.Model):
	board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="activities")
	actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activities")
	action = models.CharField(max_length=50)  # "card_created", "card_moved", "comment_added", etc.
	meta = models.JSONField(default=dict, blank=True)  # Datos adicionales en formato JSON
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ["-created_at"]

	def __str__(self) -> str:
		return f"{self.actor.username} - {self.action}"

# Create your models here.
