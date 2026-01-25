import { useState, useEffect } from 'react';
import { useApi } from './useApi';

export interface BooleanTagData {
  value: boolean;
  timestamp: string;
  quality: string;
  status: string;
}

export function useBooleanTag(tagName: string, refreshInterval: number = 2000) {
  const { api } = useApi();
  const [data, setData] = useState<BooleanTagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTag = async () => {
      try {
        const response = await api.get<BooleanTagData>(`/tags/${tagName}/`);
        if (isMounted) {
          setData(response.data);
          setError(null);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch tag');
          setLoading(false);
        }
      }
    };

    fetchTag();
    const interval = setInterval(fetchTag, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tagName, refreshInterval, api]);

  return { data, loading, error };
}
