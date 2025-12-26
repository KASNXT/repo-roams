// src/hooks/useTagUnits.ts
import { useState, useEffect } from "react";
import api from "@/services/api"; // Axios instance
import { normalizeKey } from "@/utils/lowercase";

export interface Tag {
  name: string;
  tag_units: string;
}

export const useTagUnits = (): {
  tags: Tag[];
  tagUnits: Record<string, string>;
  loading: boolean;
} => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagUnits, setTagUnits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      try {
        const res = await api.get<{ name: string; tag_units: string | null }[]>("/tag-names/");
        const data: Tag[] = res.data.map(tag => ({
          name: tag.name,
          tag_units: tag.tag_units || "",
        }));

        const map: Record<string, string> = {};
        data.forEach(tag => {
          map[normalizeKey(tag.name)] = tag.tag_units;
        });

        setTags(data);
        setTagUnits(map);
      } catch (err) {
        console.error("Failed to fetch tag names:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  return { tags, tagUnits, loading };
};
