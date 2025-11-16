import { MessageSquare, FileSearch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QueryResponse } from '@/types/rag';
import { SourceNode } from './SourceNode';

interface QueryResultsProps {
  response: QueryResponse;
}

export function QueryResults({ response }: QueryResultsProps) {
  return (
    <div className="space-y-6">
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Ответ</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{response.answer}</p>
        </CardContent>
      </Card>

      {response.source_nodes && response.source_nodes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              Источники ({response.source_nodes.length})
            </h3>
          </div>
          
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {response.source_nodes.map((node, index) => (
                <SourceNode key={node.chunk_id || index} node={node} index={index} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
