import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GaugeCardProps {
  title: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  icon: React.ComponentType<{ className?: string }>;
  status?: "normal" | "warning" | "critical";
  stationName: string;
}

export function GaugeCard({ 
  title, 
  value, 
  unit, 
  min, 
  max, 
  icon: Icon, 
  status = "normal",
  stationName 
}: GaugeCardProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  const statusColors = {
    normal: "text-status-connected",
    warning: "text-status-warning",
    critical: "text-status-disconnected"
  };

  const gaugeColors = {
    normal: "stroke-status-connected",
    warning: "stroke-status-warning", 
    critical: "stroke-status-disconnected"
  };

  // Calculate the stroke-dasharray for the progress arc
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className={cn("h-4 w-4", statusColors[status])} />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{stationName}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className={cn("text-2xl font-bold", statusColors[status])}>
              {value.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">{unit}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Range: {min}-{max} {unit}
            </div>
          </div>
          
          {/* Circular Gauge */}
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className={cn("transition-all duration-300", gaugeColors[status])}
              />
            </svg>
            {/* Removed percentage text, only show the circular bar visually */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}