import { useState } from 'react';
import { QueryResponse, QueryHistory } from '@/types/rag';
import { ragApi } from '@/api/ragApi';
import { useToast } from '@/hooks/use-toast';

export const useQuery = () => {
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<QueryResponse | null>(null);
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const { toast } = useToast();

  const executeQuery = async (query: string, useLlm: boolean = false) => {
    if (!query.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите запрос',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = useLlm
        ? await ragApi.queryLlm(query)
        : await ragApi.query(query);

      setCurrentResponse(response);

      // Add to history
      const historyItem: QueryHistory = {
        id: Date.now().toString(),
        query: response.query,
        answer: response.answer,
        timestamp: response.timestamp || new Date().toISOString(),
        source_count: response.source_nodes.length,
      };
      setHistory([historyItem, ...history]);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить запрос',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setCurrentResponse(null);
  };

  return {
    loading,
    currentResponse,
    history,
    executeQuery,
    clearHistory,
  };
};
