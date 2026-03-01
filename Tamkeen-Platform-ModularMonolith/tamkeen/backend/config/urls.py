from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/accounts/", include("apps.accounts.api.urls")),
    path("api/v1/workflow/", include("apps.workflow.api.urls")),
    path("api/v1/clients/", include("apps.clients.api.urls")),
    path("api/v1/cases/", include("apps.cases.api.urls")),
    path("api/v1/tasks/", include("apps.tasks.api.urls")),
    path("api/v1/finance/", include("apps.finance.api.urls")),
    path("api/v1/documents/", include("apps.documents.api.urls")),
    path("api/v1/messages/", include("apps.messages_app.api.urls")),
    path("api/v1/calendar/", include("apps.calendar_app.api.urls")),
    path("api/v1/ai/", include("apps.ai_engine.api.urls")),
]
