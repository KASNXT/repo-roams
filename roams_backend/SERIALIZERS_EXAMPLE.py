"""
API Serializers for OPC UA Node Configuration with UI Display Fields

Add this to your roams_opcua_mgr/serializers.py to expose UI display configuration to frontend
"""

from rest_framework import serializers
from roams_opcua_mgr.models import OPCUANode, TagName


class OPCUANodeDisplaySerializer(serializers.ModelSerializer):
    """Serializer that includes UI display configuration for frontend rendering"""
    
    tag_name_str = serializers.CharField(source='tag_name.name', read_only=True)
    
    class Meta:
        model = OPCUANode
        fields = [
            # Basic info
            'id',
            'node_id',
            'tag_name',
            'tag_name_str',
            'tag_units',
            'last_value',
            'last_updated',
            
            # Data type and display configuration
            'data_type',
            'display_type',
            'decimal_places',
            'display_min',
            'display_max',
            'icon',
            'is_boolean_control',
            
            # Thresholds
            'warning_level',
            'critical_level',
            
            # Access control
            'access_level',
        ]
        read_only_fields = [
            'id', 'node_id', 'last_value', 'last_updated',
            'data_type', 'display_type', 'decimal_places',
            'display_min', 'display_max', 'icon'
        ]


class OPCUANodeSimpleSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    
    class Meta:
        model = OPCUANode
        fields = [
            'id', 'node_id', 'tag_name', 'tag_units',
            'data_type', 'display_type', 'icon',
            'last_value', 'last_updated'
        ]


class OPCUANodeFullSerializer(serializers.ModelSerializer):
    """Full serializer with all details including operational limits"""
    
    tag_name_str = serializers.CharField(source='tag_name.name', read_only=True)
    
    class Meta:
        model = OPCUANode
        fields = [
            # Basic info
            'id',
            'node_id',
            'tag_name',
            'tag_name_str',
            'tag_units',
            'last_value',
            'last_updated',
            
            # Data type and display
            'data_type',
            'display_type',
            'decimal_places',
            'display_min',
            'display_max',
            'icon',
            'is_boolean_control',
            
            # Operational limits
            'min_value',
            'max_value',
            
            # Thresholds
            'warning_level',
            'critical_level',
            'severity',
            'threshold_active',
            
            # Sampling
            'sampling_interval',
            'sample_on_whole_number_change',
            
            # Access control
            'access_level',
            
            # Status
            'is_alarm',
        ]


# ============= Usage Examples =============

"""
Example 1: In your ViewSet
from rest_framework import viewsets
from .serializers import OPCUANodeDisplaySerializer

class OPCUANodeViewSet(viewsets.ModelViewSet):
    queryset = OPCUANode.objects.all()
    serializer_class = OPCUANodeDisplaySerializer
    
    # GET /api/opcua-nodes/ - Returns list with display config
    # GET /api/opcua-nodes/<id>/ - Returns full node config


Example 2: Using different serializers for different actions
from rest_framework import viewsets
from .serializers import (
    OPCUANodeSimpleSerializer,
    OPCUANodeDisplaySerializer,
    OPCUANodeFullSerializer
)

class OPCUANodeViewSet(viewsets.ModelViewSet):
    queryset = OPCUANode.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return OPCUANodeSimpleSerializer  # Lightweight for lists
        elif self.action == 'retrieve':
            return OPCUANodeFullSerializer    # Full details
        else:
            return OPCUANodeDisplaySerializer # Default


Example 3: Frontend React Hook
// hooks/useOPCUANodes.ts
import { useApi } from '@/hooks/useApi';

interface OPCUANodeWithDisplay {
  id: number;
  node_id: string;
  tag_name: number;
  tag_name_str: string;
  data_type: 'Float' | 'Double' | 'Int16' | 'UInt16' | 'Boolean' | 'String';
  display_type: 'numeric' | 'gauge' | 'gauge-circular' | 'progress' | 'switch' | 'status-indicator' | 'chart';
  decimal_places: number;
  display_min?: number;
  display_max?: number;
  icon?: string;
  is_boolean_control: boolean;
  last_value: string;
  last_updated: string;
  tag_units: string;
  warning_level?: number;
  critical_level?: number;
}

export function useOPCUANodes() {
  const { api } = useApi();
  const [nodes, setNodes] = useState<OPCUANodeWithDisplay[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/opcua-nodes/');
      const data = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.results || []);
      setNodes(data);
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  return { nodes, loading, fetchNodes };
}


Example 4: Rendering component based on display type
// components/NodeRenderer.tsx
import { OPCUANodeWithDisplay } from '@/hooks/useOPCUANodes';
import { LinearGauge } from '@/components/gauges/LinearGauge';
import { CircularGauge } from '@/components/gauges/CircularGauge';
import { StatusIndicator } from '@/components/indicators/StatusIndicator';
import { BooleanToggle } from '@/components/controls/BooleanToggle';

export const NodeRenderer = ({ node }: { node: OPCUANodeWithDisplay }) => {
  const displayValue = parseFloat(node.last_value || '0');
  
  // Determine if value is in warning/critical range
  const isWarning = node.warning_level && displayValue >= node.warning_level;
  const isCritical = node.critical_level && displayValue >= node.critical_level;
  const severity = isCritical ? 'critical' : isWarning ? 'warning' : 'normal';

  switch (node.display_type) {
    case 'gauge':
      return (
        <LinearGauge
          value={displayValue}
          min={node.display_min || 0}
          max={node.display_max || 100}
          decimals={node.decimal_places}
          units={node.tag_units}
          warningLevel={node.warning_level}
          criticalLevel={node.critical_level}
          severity={severity}
        />
      );

    case 'gauge-circular':
      return (
        <CircularGauge
          value={displayValue}
          min={node.display_min || 0}
          max={node.display_max || 100}
          decimals={node.decimal_places}
          icon={node.icon}
          severity={severity}
        />
      );

    case 'progress':
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">{node.tag_name_str}</label>
          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
            <div
              className={`h-full transition-all ${
                isCritical ? 'bg-red-500' :
                isWarning ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{
                width: `${((displayValue - (node.display_min || 0)) / ((node.display_max || 100) - (node.display_min || 0))) * 100}%`
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>{displayValue.toFixed(node.decimal_places)} {node.tag_units}</span>
            <span>{node.display_max || 100}</span>
          </div>
        </div>
      );

    case 'switch':
      return (
        <BooleanToggle
          value={node.last_value === 'true' || node.last_value === '1'}
          label={node.tag_name_str}
          disabled={!node.is_boolean_control}
          onChange={(newValue) => {
            // Handle toggle if is_boolean_control is true
            if (node.is_boolean_control) {
              // Send control command to API
            }
          }}
        />
      );

    case 'status-indicator':
      return (
        <StatusIndicator
          label={node.tag_name_str}
          active={node.last_value === 'true' || node.last_value === '1'}
          icon={node.icon}
          severity={severity}
        />
      );

    case 'numeric':
    default:
      return (
        <div className={`p-4 rounded-lg border ${
          isCritical ? 'border-red-500 bg-red-50' :
          isWarning ? 'border-yellow-500 bg-yellow-50' :
          'border-gray-200 bg-white'
        }`}>
          <p className="text-sm text-gray-600">{node.tag_name_str}</p>
          <p className="text-3xl font-bold">
            {displayValue.toFixed(node.decimal_places)}
          </p>
          <p className="text-sm text-gray-500">{node.tag_units}</p>
        </div>
      );
  }
};
"""
