// roams_frontend/src/hooks/useTelemetryData.ts
import { useEffect, useState } from "react";
import axios from "axios";
import type { DateRange } from "react-day-picker";
import { getServerUrl } from "@/services/api";

export interface TelemetryPoint {
  timestamp: string;
  value: number;
  parameter: string;
}

export const useTelemetryData = (stationId: string, dateRange?: DateRange) => {
  const [data, setData] = useState<Record<string, TelemetryPoint[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);

    const params: any = {};
    if (dateRange?.from) params.from = dateRange.from.toISOString();
    if (dateRange?.to) params.to = dateRange.to.toISOString();

    axios
      .get(`${getServerUrl()}/api/telemetry/`, {
        params: {
          station: stationId,
          ...params,
        },
      })
      .then((res) => {
        const grouped: Record<string, TelemetryPoint[]> = {};
        (res.data as TelemetryPoint[]).forEach((item: any) => {
          const key = item.parameter.toLowerCase().replace(/\s+/g, "");
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(item);
        });
        setData(grouped);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch telemetry:", err);
        setLoading(false);
      });
  }, [stationId, dateRange]);

  return { data, loading };
};
