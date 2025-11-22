from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter
from api.views import (
	RegisterView,
	MeView,
	BoardViewSet,
	ListViewSet,
	CardViewSet,
	CardsSearchView,
	CommentViewSet,
	ChecklistItemViewSet,
	LabelViewSet,
	ActivityLogView,
	NotificationViewSet,
	PushSubscriptionViewSet,
)

router = DefaultRouter()
router.register(r"boards", BoardViewSet, basename="board")
router.register(r"lists", ListViewSet, basename="list")
router.register(r"cards", CardViewSet, basename="card")
router.register(r"comments", CommentViewSet, basename="comment")
router.register(r"checklist", ChecklistItemViewSet, basename="checklist")
router.register(r"labels", LabelViewSet, basename="label")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"push-subscriptions", PushSubscriptionViewSet, basename="push-subscription")

urlpatterns = [
	path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
	path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
	path("auth/register/", RegisterView.as_view(), name="auth_register"),
	path("me/", MeView.as_view(), name="me"),
	path("cards/search/", CardsSearchView.as_view(), name="cards_search"),
	path("boards/<int:board_id>/activity/", ActivityLogView.as_view(), name="board_activity"),
	path("", include(router.urls)),
]

