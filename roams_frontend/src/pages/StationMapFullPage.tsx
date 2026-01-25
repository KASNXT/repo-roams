import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StationMap } from "@/components/StationMap";
import { ChevronLeft } from "lucide-react";

export default function StationMapFullPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4 shadow-sm z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Station Map - Full View</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time station locations and operational metrics
          </p>
        </div>
      </div>

      {/* Map Container - Full Height */}
      <div className="flex-1 overflow-hidden">
        <StationMap fullPage={true} />
      </div>
    </div>
  );
}
