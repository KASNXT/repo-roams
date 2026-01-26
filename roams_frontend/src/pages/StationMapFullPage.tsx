import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StationMap } from "@/components/StationMap";
import { ChevronLeft } from "lucide-react";

export default function StationMapFullPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header - Sticky on ALL screens */}
      <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 p-3 md:p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <h1 className="text-lg md:text-2xl font-bold">Station Map - Full View</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
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
