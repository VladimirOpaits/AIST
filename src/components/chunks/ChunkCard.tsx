import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chunk } from '@/types/rag';

interface ChunkCardProps {
  chunk: Chunk;
  index: number;
  searchQuery?: string;
}

export function ChunkCard({ chunk, index, searchQuery }: ChunkCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const highlightText = (text: string, query?: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-accent text-accent-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Чанк {index + 1}
              {chunk.metadata.page && (
                <Badge variant="outline" className="ml-2">
                  Стр. {chunk.metadata.page}
                </Badge>
              )}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {chunk.summary && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs font-medium text-muted-foreground mb-1">Краткое содержание</p>
              <p className="text-sm">{chunk.summary}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm text-muted-foreground mb-2">Текст</p>
            <p className={`text-sm leading-relaxed ${!isExpanded && 'line-clamp-3'}`}>
              {highlightText(chunk.text, searchQuery)}
            </p>
          </div>

          {isExpanded && Object.keys(chunk.metadata).length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Метаданные</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(chunk.metadata).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
