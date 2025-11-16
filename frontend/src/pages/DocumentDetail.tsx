import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChunkCard } from '@/components/chunks/ChunkCard';
import { ragApi } from '@/api/ragApi';
import { Document } from '@/types/rag';
import { useToast } from '@/hooks/use-toast';

export default function DocumentDetail() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchDocument = async () => {
      if (!docId) return;
      try {
        const doc = await ragApi.getDocument(docId);
        setDocument(doc);
      } catch (error) {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить документ',
          variant: 'destructive',
        });
        navigate('/documents');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [docId, navigate, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const filteredChunks = searchQuery
    ? document.chunks.filter(
        (chunk) =>
          chunk.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chunk.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : document.chunks;

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/documents')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к документам
        </Button>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{document.metadata.file_name}</h1>
              <p className="text-muted-foreground">
                {document.chunks.length} чанков
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по чанкам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-3 pr-4">
          {filteredChunks.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Ничего не найдено по запросу "{searchQuery}"
              </p>
            </div>
          ) : (
            filteredChunks.map((chunk, index) => (
              <ChunkCard
                key={chunk.chunk_id || index}
                chunk={chunk}
                index={index}
                searchQuery={searchQuery}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
