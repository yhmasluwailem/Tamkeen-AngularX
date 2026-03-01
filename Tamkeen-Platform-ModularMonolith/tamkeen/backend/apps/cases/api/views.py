from rest_framework import viewsets, serializers
from apps.cases.models import Case

class CaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = "__all__"

class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.filter(is_deleted=False)
    serializer_class = CaseSerializer
