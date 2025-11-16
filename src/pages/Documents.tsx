import { FileText, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Documents() {
  const { documents, loading, refetch, deleteDocument } = useDocuments();

  // Group documents by source
  const groupedDocs = documents.reduce((acc, doc) => {
    const source = doc.metadata.source || 'Unknown';
    if (!acc[source]) {
      acc[source] = [];
    }
    acc[source].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Документы</h1>
          </div>
          <p className="text-muted-foreground">
            Всего чанков: {documents.length} | Документов: {Object.keys(groupedDocs).length}
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Нет документов</h3>
          <p className="text-muted-foreground">
            Загрузите документы для начала работы
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedDocs).map(([source, chunks]) => (
            <Card key={source}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{source}</h3>
                      <p className="text-sm text-muted-foreground">
                        {chunks.length} чанков
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие удалит все {chunks.length} чанков документа "{source}". Отменить это действие невозможно.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            chunks.forEach(chunk => deleteDocument(chunk.doc_id));
                          }}
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {chunks.map((chunk, index) => (
                      <div
                        key={chunk.doc_id}
                        className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {chunk.metadata.chunk_index !== undefined 
                              ? `Чанк ${chunk.metadata.chunk_index}`
                              : `#${index + 1}`}
                          </Badge>
                        </div>
                        <p className="text-sm line-clamp-3">{chunk.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
