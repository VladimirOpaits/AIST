import { useState } from 'react';
import { QueryResponse, LLMQueryResponse, QueryHistory } from '@/types/rag';
import { ragApi } from '@/api/ragApi';
import { useToast } from '@/hooks/use-toast';

export const useQuery = () => {
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<QueryResponse | LLMQueryResponse | null>(null);
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
        query: 'query' in response ? response.query : query,
        answer: 'answer' in response ? response.answer : `Найдено ${response.results.length} результатов`,
        timestamp: new Date().toISOString(),
        source_count: 'source_nodes' in response ? response.source_nodes.length : response.results.length,
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
