import { useState } from 'react';
import { useApi } from './useApi';
import { toast } from 'sonner';

export function useBooleanControl(tagName: string) {
  const { api } = useApi();
  const [isWriting, setIsWriting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const writeValue = async (newValue: boolean, reason?: string) => {
    try {
      setIsWriting(true);
      setLastError(null);

      const response = await api.post(`/tags/${tagName}/write/`, {
        value: newValue,
        reason: reason || 'User control action',
        timestamp: new Date().toISOString(),
      });

      toast.success(`${tagName} set to ${newValue ? 'ON' : 'OFF'}`);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to write value';
      setLastError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsWriting(false);
    }
  };

  return { writeValue, isWriting, lastError };
}
