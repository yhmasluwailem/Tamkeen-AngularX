from rest_framework import viewsets, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from apps.tasks.models import Task, TaskRevision

class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.name_ar", read_only=True, default="—")
    assigned_by_name = serializers.CharField(source="assigned_by.name_ar", read_only=True, default="—")
    reviewed_by_name = serializers.CharField(source="reviewed_by.name_ar", read_only=True, default="—")
    class Meta:
        model = Task
        fields = "__all__"

class TaskRevisionSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.name_ar", read_only=True, default="—")
    class Meta:
        model = TaskRevision
        fields = "__all__"

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Task.objects.filter(is_deleted=False).select_related("assigned_to", "assigned_by", "reviewed_by")
        if user.is_manager:
            return qs
        return qs.filter(assigned_to=user)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        task = self.get_object()
        task.status = "in_progress"
        task.started_at = timezone.now()
        task.save()
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        task = self.get_object()
        task.status = "submitted"
        task.submitted_at = timezone.now()
        task.work_notes = request.data.get("work_notes", task.work_notes)
        task.save()
        rev_num = task.revisions.count() + 1
        TaskRevision.objects.create(task=task, revision_number=rev_num, revision_type="submitted", author=request.user, notes=task.work_notes)
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        task = self.get_object()
        decision = request.data.get("decision")  # "approve" or "return"
        notes = request.data.get("review_notes", "")
        task.reviewed_by = request.user
        task.review_notes = notes
        rev_num = task.revisions.count() + 1

        if decision == "approve":
            task.status = "approved"
            task.completed_at = timezone.now()
            task.completion_percentage = 100
            TaskRevision.objects.create(task=task, revision_number=rev_num, revision_type="approved", author=request.user, notes=notes)
        else:
            task.status = "returned"
            task.return_count += 1
            TaskRevision.objects.create(task=task, revision_number=rev_num, revision_type="returned", author=request.user, notes=notes)

        task.save()
        return Response(self.get_serializer(task).data)

    @action(detail=False, methods=["get"], url_path="my-summary")
    def my_summary(self, request):
        user = request.user
        qs = Task.objects.filter(is_deleted=False, assigned_to=user)
        return Response({
            "total": qs.count(),
            "pending": qs.filter(status="pending").count(),
            "in_progress": qs.filter(status="in_progress").count(),
            "submitted": qs.filter(status="submitted").count(),
            "returned": qs.filter(status="returned").count(),
            "completed": qs.filter(status__in=["approved", "completed"]).count(),
        })
