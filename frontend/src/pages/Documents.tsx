import { FileText, Loader2, RefreshCw } from 'lucide-react';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { useDocuments } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';

export default function Documents() {
  const { documents, loading, refetch, deleteDocument } = useDocuments();

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
            Всего документов: {documents.length}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.doc_id}
              document={doc}
              onDelete={deleteDocument}
            />
          ))}
        </div>
      )}
    </div>
  );
}
