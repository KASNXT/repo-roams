import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import api from '@/services/api';

interface DeviceSpecs {
  id: number;
  station: number;
  motor_power_rating?: number;
  rated_current?: number;
  rated_flow_rate?: number;
  rated_head?: number;
  rated_pressure_bar?: number; // Alternative: pressure in bar (converts to head)
  effective_rated_head?: number; // Calculated head from pressure if needed
  device_model?: string;
  manufacturer?: string;
}

interface ComparisonMetrics {
  current_percent?: number;
  current_above_rated?: boolean;
  flow_percent?: number;
  flow_above_rated?: boolean;
  head_percent?: number;
  head_above_rated?: boolean;
  power_efficiency?: number;
  power_above_rated?: boolean;
}

interface RatedVsActualProps {
  stationId: number;
  currentCurrent?: number; // Current motor current in Amperes
  currentFlowRate?: number; // Current flow in m³/h
  currentHead?: number; // Current head in meters (direct measurement)
  currentPressureBar?: number; // OR current pressure in bar (auto-converts: 1 bar = 10.197 m head)
  currentPower?: number; // Current power in kW
}

export function RatedVsActualComparison({
  stationId,
  currentCurrent,
  currentFlowRate,
  currentHead,
  currentPressureBar,
  currentPower,
}: RatedVsActualProps) {
  const [specs, setSpecs] = useState<DeviceSpecs | null>(null);
  const [metrics, setMetrics] = useState<ComparisonMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecs = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/device-specs/by_station/?station_id=${stationId}`);
        setSpecs(response.data);

        // Calculate metrics if current readings are available
        if (response.data) {
          const metricsResponse = await api.post(`/device-specs/${response.data.id}/compare_metrics/`, {
            current_current: currentCurrent,
            current_flow: currentFlowRate,
            current_head: currentHead,
            current_pressure_bar: currentPressureBar,
            current_power: currentPower,
          });
          setMetrics(metricsResponse.data.performance_metrics);
        }
      } catch (err) {
        setError('No device specifications configured for this station');
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    if (stationId) {
      fetchSpecs();
    }
  }, [stationId, currentCurrent, currentFlowRate, currentHead, currentPressureBar, currentPower]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rated vs Actual Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading specifications...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!specs) {
    return null;
  }

  const getStatusColor = (isAboveRated?: boolean, percent?: number) => {
    if (isAboveRated) {
      return '#ef4444'; // Red - Over rated
    }
    if (percent && percent > 90) {
      return '#f59e0b'; // Orange - Near rated
    }
    return '#10b981'; // Green - Normal
  };

  const getStatusLabel = (isAboveRated?: boolean, percent?: number) => {
    if (isAboveRated) {
      return '⚠ Over Rated';
    }
    if (percent && percent > 90) {
      return '🔶 Near Rated';
    }
    return '✓ Normal';
  };

  return (
    <div className="w-full overflow-hidden">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <TrendingUp className="h-5 w-5 flex-shrink-0" />
            <span>Rated vs Actual Performance</span>
          </CardTitle>
          {specs.device_model && (
            <p className="text-xs text-muted-foreground mt-2">
              {specs.device_model}
              {specs.manufacturer && ` • ${specs.manufacturer}`}
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 overflow-x-auto">
          {/* Current Comparison */}
          {specs.rated_current && currentCurrent !== undefined && metrics?.current_percent !== undefined && (
            <div className="border rounded-lg p-3 md:p-4 bg-gray-50 overflow-hidden flex flex-col">
              <div className="text-sm font-medium text-gray-700 mb-2">Motor Current</div>
              <div className="space-y-2 min-h-0">
                <div>
                  <p className="text-xs text-gray-600">Rated</p>
                  <p className="text-base md:text-lg font-semibold truncate">{specs.rated_current} A</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Current</p>
                  <p className="text-base md:text-lg font-semibold truncate">{currentCurrent.toFixed(2)} A</p>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">% of Rated</p>
                    <span
                      className="text-sm font-bold flex-shrink-0"
                      style={{ color: getStatusColor(metrics.current_above_rated, metrics.current_percent) }}
                    >
                      {metrics.current_percent}%
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: getStatusColor(metrics.current_above_rated, metrics.current_percent) }}>
                    {getStatusLabel(metrics.current_above_rated, metrics.current_percent)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Flow Rate Comparison */}
          {specs.rated_flow_rate && currentFlowRate !== undefined && metrics?.flow_percent !== undefined && (
            <div className="border rounded-lg p-3 md:p-4 bg-gray-50 overflow-hidden flex flex-col">
              <div className="text-sm font-medium text-gray-700 mb-2">Flow Rate</div>
              <div className="space-y-2 min-h-0">
                <div>
                  <p className="text-xs text-gray-600">Rated</p>
                  <p className="text-base md:text-lg font-semibold truncate">{specs.rated_flow_rate} m³/h</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Current</p>
                  <p className="text-base md:text-lg font-semibold truncate">{currentFlowRate.toFixed(2)} m³/h</p>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">% of Rated</p>
                    <span
                      className="text-sm font-bold flex-shrink-0"
                      style={{ color: getStatusColor(metrics.flow_above_rated, metrics.flow_percent) }}
                    >
                      {metrics.flow_percent}%
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: getStatusColor(metrics.flow_above_rated, metrics.flow_percent) }}>
                    {getStatusLabel(metrics.flow_above_rated, metrics.flow_percent)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Head Comparison */}
          {(specs.rated_head || specs.effective_rated_head) && currentHead !== undefined && metrics?.head_percent !== undefined && (
            <div className="border rounded-lg p-3 md:p-4 bg-gray-50 overflow-hidden flex flex-col">
              <div className="text-sm font-medium text-gray-700 mb-2">Pump Head</div>
              <div className="space-y-2 min-h-0">
                <div>
                  <p className="text-xs text-gray-600">Rated</p>
                  <p className="text-base md:text-lg font-semibold truncate">
                    {specs.effective_rated_head || specs.rated_head} m
                    {specs.rated_pressure_bar && (
                      <span className="text-xs text-gray-400 ml-1">({specs.rated_pressure_bar} bar)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Current</p>
                  <p className="text-base md:text-lg font-semibold truncate">{currentHead.toFixed(2)} m</p>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">% of Rated</p>
                    <span
                      className="text-sm font-bold flex-shrink-0"
                      style={{ color: getStatusColor(metrics.head_above_rated, metrics.head_percent) }}
                    >
                      {metrics.head_percent}%
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: getStatusColor(metrics.head_above_rated, metrics.head_percent) }}>
                    {getStatusLabel(metrics.head_above_rated, metrics.head_percent)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Head from Pressure (when pressure is available) */}
          {specs.rated_pressure_bar && currentPressureBar !== undefined && metrics?.head_percent !== undefined && (
            <div className="border rounded-lg p-3 md:p-4 bg-gray-50 overflow-hidden flex flex-col">
              <div className="text-sm font-medium text-gray-700 mb-2">Pump Head (from Pressure)</div>
              <div className="space-y-2 min-h-0">
                <div>
                  <p className="text-xs text-gray-600">Rated Pressure</p>
                  <p className="text-base md:text-lg font-semibold truncate">{specs.rated_pressure_bar} bar</p>
                  <p className="text-xs text-gray-500">= {specs.effective_rated_head} m head</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Current Pressure</p>
                  <p className="text-base md:text-lg font-semibold truncate">{currentPressureBar} bar</p>
                  <p className="text-xs text-gray-500">= {(currentPressureBar * 10.197).toFixed(2)} m head</p>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">% of Rated</p>
                    <span
                      className="text-sm font-bold flex-shrink-0"
                      style={{ color: getStatusColor(metrics.head_above_rated, metrics.head_percent) }}
                    >
                      {metrics.head_percent}%
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: getStatusColor(metrics.head_above_rated, metrics.head_percent) }}>
                    {getStatusLabel(metrics.head_above_rated, metrics.head_percent)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Power Efficiency */}
          {specs.motor_power_rating && currentPower !== undefined && metrics?.power_efficiency !== undefined && (
            <div className="border rounded-lg p-3 md:p-4 bg-gray-50 overflow-hidden flex flex-col">
              <div className="text-sm font-medium text-gray-700 mb-2">Power Usage</div>
              <div className="space-y-2 min-h-0">
                <div>
                  <p className="text-xs text-gray-600">Rated</p>
                  <p className="text-base md:text-lg font-semibold truncate">{specs.motor_power_rating} kW</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Current</p>
                  <p className="text-base md:text-lg font-semibold truncate">{currentPower.toFixed(2)} kW</p>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">% of Rated</p>
                    <span
                      className="text-sm font-bold flex-shrink-0"
                      style={{ color: getStatusColor(metrics.power_above_rated, metrics.power_efficiency) }}
                    >
                      {metrics.power_efficiency}%
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: getStatusColor(metrics.power_above_rated, metrics.power_efficiency) }}>
                    {getStatusLabel(metrics.power_above_rated, metrics.power_efficiency)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend & Conversion Info */}
        <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
          <div className="p-3 md:p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-2">Performance Legend</p>
            <div className="grid grid-cols-3 gap-2 md:gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-gray-700 truncate">Normal (&lt;90%)</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-gray-700 truncate">Near Rated</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-gray-700 truncate">Over Rated</span>
              </div>
            </div>
          </div>

          <div className="p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-green-900 mb-2">💧 Pressure ↔ Head Conversion</p>
            <p className="text-xs text-green-800">
              <strong>Formula:</strong> Head (m) = Pressure (bar) × 10.197
            </p>
            <p className="text-xs text-green-700 mt-1">
              Both pressure and head measurements are automatically converted for comparison.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
