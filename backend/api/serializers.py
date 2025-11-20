from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Board, List, Card, Label, Comment, ChecklistItem, ActivityLog


class UserSlimSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ("id", "username")


class BoardSerializer(serializers.ModelSerializer):
	owner = UserSlimSerializer(read_only=True)
	members = UserSlimSerializer(many=True, read_only=True)

	class Meta:
		model = Board
		fields = ("id", "name", "owner", "members", "color", "due_date", "created_at")
		read_only_fields = ("id", "owner", "members", "created_at")


class ListSerializer(serializers.ModelSerializer):
	class Meta:
		model = List
		fields = ("id", "board", "title", "position")
		read_only_fields = ("id", "board")


class LabelSerializer(serializers.ModelSerializer):
	class Meta:
		model = Label
		fields = ("id", "board", "name", "color")
		read_only_fields = ("id", "board")


class CardSerializer(serializers.ModelSerializer):
	assignees = UserSlimSerializer(many=True, read_only=True)
	labels = LabelSerializer(many=True, read_only=True)
	created_by = UserSlimSerializer(read_only=True)
	list = serializers.PrimaryKeyRelatedField(queryset=List.objects.all(), required=False)

	class Meta:
		model = Card
		fields = (
			"id",
			"list",
			"title",
			"description",
			"due_date",
			"priority",
			"position",
			"created_by",
			"assignees",
			"labels",
			"created_at",
		)
		read_only_fields = ("id", "created_by", "assignees", "labels", "created_at")


class CommentSerializer(serializers.ModelSerializer):
	author = UserSlimSerializer(read_only=True)

	class Meta:
		model = Comment
		fields = ("id", "card", "author", "content", "created_at")
		read_only_fields = ("id", "author", "created_at")


class ChecklistItemSerializer(serializers.ModelSerializer):
	class Meta:
		model = ChecklistItem
		fields = ("id", "card", "text", "done", "position")
		read_only_fields = ("id",)


class ActivityLogSerializer(serializers.ModelSerializer):
	actor = UserSlimSerializer(read_only=True)

	class Meta:
		model = ActivityLog
		fields = ("id", "board", "actor", "action", "meta", "created_at")
		read_only_fields = ("id", "actor", "created_at")

