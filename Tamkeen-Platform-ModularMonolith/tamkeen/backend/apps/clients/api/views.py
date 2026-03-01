from rest_framework import viewsets, serializers
from apps.clients.models import Client

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = "__all__"

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.filter(is_deleted=False)
    serializer_class = ClientSerializer
