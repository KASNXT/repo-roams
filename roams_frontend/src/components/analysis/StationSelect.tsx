import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchStations, type Station } from "@/services/api";

interface StationSelectProps {
  value: string;
  onChange: (station: string) => void;
}

const StationSelect: React.FC<StationSelectProps> = ({ value, onChange }) => {
  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    const loadStations = async () => {
      try {
        const data = await fetchStations();
        setStations(data);
        if (!value && data.length > 0) {
          onChange(data[0].station_name); // default to first station
        }
      } catch (err) {
        console.error("Failed to load stations:", err);
      }
    };
    loadStations();
  }, [value, onChange]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Select Station" />
      </SelectTrigger>
      <SelectContent>
        {stations.map((station) => (
          <SelectItem key={station.id} value={station.station_name}>
            {station.station_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default StationSelect;
