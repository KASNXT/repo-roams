# Init file for roams_opcua_mgr models package
from .client_config_model import OpcUaClientConfig, ConnectionLog
from .node_config_model import OPCUANode, TagName, AlarmLog, ThresholdBreach
from .authentication import AuthenticationSetting
from .logging_model import OpcUaReadLog
from .notification_model import NotificationRecipient

# Note: TagThreshold has been consolidated into OPCUANode model fields
# (warning_level, critical_level, severity, threshold_active)
