import { FileText, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Document } from '@/types/rag';
import { useNavigate } from 'react-router-dom';

interface DocumentCardProps {
  document: Document;
  onDelete: (docId: string) => void;
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const navigate = useNavigate();

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card className="hover:border-primary transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            <CardTitle className="text-lg line-clamp-1">
              {document.metadata.file_name}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Чанков</p>
            <p className="font-medium">{document.metadata.chunk_count || document.chunks?.length || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Размер</p>
            <p className="font-medium">{formatSize(document.metadata.file_size)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Загружено</p>
            <p className="font-medium">{formatDate(document.metadata.upload_date)}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/documents/${document.doc_id}`)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Просмотр
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(document.doc_id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
