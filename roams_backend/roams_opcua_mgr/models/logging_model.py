# logging_model.py
from django.db import models
from django.utils.timezone import now
from roams_opcua_mgr.models import OpcUaClientConfig, OPCUANode


class OpcUaReadLog(models.Model):
    client_config = models.ForeignKey(
        OpcUaClientConfig,
        on_delete=models.CASCADE,
        db_index=True,
        help_text="Client that performed the read"
    )
    node = models.ForeignKey(
        OPCUANode,
        on_delete=models.CASCADE,
        db_index=True,
        help_text="The node that was read"
    )
    value = models.TextField()
    timestamp = models.DateTimeField(default=now, db_index=True)

    def __str__(self):
        return f"[READ] {self.client_config.station_name} | {self.node.tag_name} = {self.value} @ {self.timestamp}"

class OpcUaWriteLog(models.Model):
    client_config = models.ForeignKey(
        OpcUaClientConfig,
        on_delete=models.CASCADE,
        db_index=True,
        help_text="Client that performed the write"
    )
    node = models.ForeignKey(
        OPCUANode,
        on_delete=models.CASCADE,
        db_index=True,
        help_text="The node that was written to"
    )
    value = models.TextField()
    command = models.CharField(max_length=255, blank=True, null=True, help_text="Optional command like STOP or START")
    timestamp = models.DateTimeField(default=now, db_index=True)

    def __str__(self):
        return f"[WRITE] {self.client_config.station_name} | {self.node.tag_name} = {self.value} @ {self.timestamp}"
