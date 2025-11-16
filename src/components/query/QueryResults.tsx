import { CheckCircle2, FileText } from 'lucide-react';
import { QueryResponse, LLMQueryResponse } from '@/types/rag';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QueryResultsProps {
  response: QueryResponse | LLMQueryResponse;
}

export function QueryResults({ response }: QueryResultsProps) {
  const isLLMResponse = 'answer' in response;

  return (
    <div className="space-y-4">
      {/* Query */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Запрос</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{response.query}</p>
        </CardContent>
      </Card>

      {/* Answer (LLM only) */}
      {isLLMResponse && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Ответ</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{response.answer}</p>
          </CardContent>
        </Card>
      )}

      {/* Source Nodes / Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {isLLMResponse ? 'Источники' : 'Результаты поиска'}
            </CardTitle>
            <Badge variant="secondary">
              {isLLMResponse ? response.source_nodes.length : response.results.length} результатов
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {isLLMResponse ? (
                response.source_nodes.map((node, index) => (
                  <div key={node.id} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{index + 1}
                        </Badge>
                        {node.metadata.source && (
                          <span className="text-sm text-muted-foreground">
                            {node.metadata.source}
                          </span>
                        )}
                        {node.metadata.chunk_index !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            Чанк {node.metadata.chunk_index}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">{node.text}</p>
                    {index < response.source_nodes.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))
              ) : (
                response.results.map((result, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{index + 1}
                        </Badge>
                        {result.metadata.source && (
                          <span className="text-sm text-muted-foreground">
                            {result.metadata.source}
                          </span>
                        )}
                        {result.metadata.chunk_index !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            Чанк {result.metadata.chunk_index}
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {result.distance.toFixed(3)}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed">{result.text}</p>
                    {index < response.results.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
