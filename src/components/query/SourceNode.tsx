import { FileText, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SourceNode as SourceNodeType } from '@/types/rag';

interface SourceNodeProps {
  node: SourceNodeType;
  index: number;
}

export function SourceNode({ node, index }: SourceNodeProps) {
  const relevancePercent = Math.round(node.score * 100);
  
  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-success';
    if (score >= 0.6) return 'text-primary';
    if (score >= 0.4) return 'text-accent';
    return 'text-muted-foreground';
  };

  return (
    <Card className="hover:border-primary transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-sm font-medium">
              Источник {index + 1}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Star className={`h-4 w-4 ${getRelevanceColor(node.score)}`} />
            <span className={`text-sm font-semibold ${getRelevanceColor(node.score)}`}>
              {relevancePercent}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {node.summary && (
          <div className="p-2 bg-muted rounded-md">
            <p className="text-xs font-medium text-muted-foreground mb-1">Краткое содержание</p>
            <p className="text-sm">{node.summary}</p>
          </div>
        )}
        
        <div>
          <p className="text-sm text-muted-foreground mb-1">Текст</p>
          <p className="text-sm leading-relaxed">{node.text}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Релевантность</span>
            <span className="font-medium">{relevancePercent}%</span>
          </div>
          <Progress value={relevancePercent} className="h-2" />
        </div>

        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t">
            {Object.entries(node.metadata).map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs">
                {key}: {String(value)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
