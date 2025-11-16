import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ragApi } from '@/api/ragApi';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface UploadState {
  file_name: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

export function DocumentUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadState({
      file_name: file.name,
      progress: 0,
      status: 'uploading',
    });

    try {
      await ragApi.uploadPdf(file, (progress) => {
        setUploadState(prev => prev ? { ...prev, progress } : null);
      });

      setUploadState(prev => prev ? { ...prev, status: 'processing', progress: 100 } : null);

      toast({
        title: 'Успешно',
        description: 'Документ загружен и обрабатывается',
      });

      setTimeout(() => {
        setUploadState(prev => prev ? { ...prev, status: 'completed' } : null);
        onUploadComplete?.();
        setTimeout(() => setUploadState(null), 2000);
      }, 1500);
    } catch (error) {
      setUploadState(prev => prev ? { ...prev, status: 'error' } : null);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить документ',
        variant: 'destructive',
      });
    }
  }, [toast, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed transition-all cursor-pointer hover:border-primary hover:bg-card/50 ${
          isDragActive ? 'border-primary bg-card/50' : ''
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? 'Отпустите файл' : 'Загрузить документ'}
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            Перетащите PDF или TXT файл сюда<br />или нажмите для выбора
          </p>
        </CardContent>
      </Card>

      {uploadState && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 mt-1 text-primary" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{uploadState.file_name}</p>
                  {uploadState.status === 'processing' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
                <Progress value={uploadState.progress} />
                <p className="text-sm text-muted-foreground">
                  {uploadState.status === 'uploading' && 'Загрузка...'}
                  {uploadState.status === 'processing' && 'Обработка документа...'}
                  {uploadState.status === 'completed' && 'Готово!'}
                  {uploadState.status === 'error' && 'Ошибка загрузки'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
