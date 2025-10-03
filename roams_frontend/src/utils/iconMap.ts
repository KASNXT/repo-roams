// src/utils/iconMap.ts
import { Droplets, Gauge, Zap, Activity, Timer, Cpu, Thermometer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function normalizeKey(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase(); 
}

export const parameterIcons: Record<string, LucideIcon> = {
  // water level aliases
  waterlevel: Droplets,
  water_level: Droplets,

  // flow rate aliases
  flowrate: Gauge,
  flow_rate: Gauge,

  // voltage
  voltage: Zap,

  // pressure
  pressure: Activity,

  // hour meter
  hourmeter: Timer,
  hour_meter: Timer,

  // current
  current: Zap,

  // temperature
  temperature: Thermometer,

  // fallback
  default: Cpu,// fallback icon if no match
};
