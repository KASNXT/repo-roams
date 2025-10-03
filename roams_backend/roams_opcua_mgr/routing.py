from django.urls import re_path
from .consumers import OPCUAServerConsumer

websocket_urlpatterns = [
    re_path(r"ws/opcua/$", OPCUAServerConsumer.as_asgi()),
]
