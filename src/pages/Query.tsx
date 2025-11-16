import { Search, History, Trash2 } from 'lucide-react';
import { QueryInterface } from '@/components/query/QueryInterface';
import { QueryResults } from '@/components/query/QueryResults';
import { useQuery } from '@/hooks/useQuery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function Query() {
  const { loading, currentResponse, history, executeQuery, clearHistory } = useQuery();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Search className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Запросы к RAG</h1>
        </div>
        <p className="text-muted-foreground">
          Задавайте вопросы по загруженным документам
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <QueryInterface onSubmit={executeQuery} loading={loading} />
          
          {currentResponse && <QueryResults response={currentResponse} />}
        </div>

        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">История</CardTitle>
                </div>
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  История запросов пуста
                </p>
              ) : (
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-3">
                    {history.map((item, index) => (
                      <div key={item.id}>
                        <div className="space-y-2">
                          <p className="text-sm font-medium line-clamp-2">
                            {item.query}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.answer}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {new Date(item.timestamp).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>•</span>
                            <span>{item.source_count} источников</span>
                          </div>
                        </div>
                        {index < history.length - 1 && (
                          <Separator className="mt-3" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
