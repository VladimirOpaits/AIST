import { Upload as UploadIcon } from 'lucide-react';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { useNavigate } from 'react-router-dom';

export default function Upload() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <UploadIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Загрузка документов</h1>
        </div>
        <p className="text-muted-foreground">
          Загрузите PDF или текстовые документы для обработки в RAG-системе
        </p>
      </div>

      <DocumentUpload
        onUploadComplete={() => {
          setTimeout(() => navigate('/documents'), 1000);
        }}
      />

      <div className="mt-8 p-4 bg-card rounded-lg border">
        <h3 className="font-semibold mb-2">Поддерживаемые форматы</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• PDF документы (.pdf)</li>
          <li>• Текстовые файлы (.txt)</li>
        </ul>
      </div>
    </div>
  );
}
