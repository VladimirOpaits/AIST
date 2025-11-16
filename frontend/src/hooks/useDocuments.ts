import { useState, useEffect } from 'react';
import { Document } from '@/types/rag';
import { ragApi } from '@/api/ragApi';
import { useToast } from '@/hooks/use-toast';

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await ragApi.getAllDocuments();
      setDocuments(docs);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить документы',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      await ragApi.deleteDocument(docId);
      setDocuments(documents.filter(doc => doc.doc_id !== docId));
      toast({
        title: 'Успешно',
        description: 'Документ удален',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить документ',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    loading,
    refetch: fetchDocuments,
    deleteDocument,
  };
};
