import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "connected" | "disconnected" | "warning" | "neutral";
  label: string;
  className?: string;
}

const statusConfig = {
  connected: {
    bgColor: "bg-status-connected-bg",
    textColor: "text-status-connected",
    icon: "🟢"
  },
  disconnected: {
    bgColor: "bg-status-disconnected-bg", 
    textColor: "text-status-disconnected",
    icon: "🔴"
  },
  warning: {
    bgColor: "bg-status-warning-bg",
    textColor: "text-status-warning", 
    icon: "🟡"
  },
  neutral: {
    bgColor: "bg-status-neutral-bg",
    textColor: "text-status-neutral",
    icon: "⚪"
  }
};

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      config.bgColor,
      config.textColor,
      className
    )}>
      <span className="text-xs">{config.icon}</span>
      {label}
    </span>
  );
}