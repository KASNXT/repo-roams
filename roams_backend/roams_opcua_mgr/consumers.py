import json
from channels.generic.websocket import AsyncWebsocketConsumer

class OPCUAServerConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        data = json.loads(text_data)
        await self.send(text_data=json.dumps({"message": f"Received: {data}"}))

    async def refresh_clients(self, event):
        """Send refresh signal to frontend."""
        await self.send(text_data=json.dumps({"message": "Refresh server list"}))
