import { useState } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface QueryInterfaceProps {
  onSubmit: (query: string, useLlm: boolean) => void;
  loading: boolean;
}

export function QueryInterface({ onSubmit, loading }: QueryInterfaceProps) {
  const [query, setQuery] = useState('');
  const [useLlm, setUseLlm] = useState(true);

  const handleSubmit = () => {
    if (query.trim()) {
      onSubmit(query, useLlm);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="query-input" className="text-base font-semibold">
              Введите запрос
            </Label>
            <div className="flex items-center gap-2">
              <Label htmlFor="llm-toggle" className="text-sm text-muted-foreground">
                LLM режим
              </Label>
              <Switch
                id="llm-toggle"
                checked={useLlm}
                onCheckedChange={setUseLlm}
              />
            </div>
          </div>
          
          <Textarea
            id="query-input"
            placeholder="Например: Какие основные темы обсуждаются в документе?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px] resize-none"
            disabled={loading}
          />

          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {useLlm ? 'Запрос будет обработан с использованием LLM' : 'Векторный поиск по документам'}
            </p>
            <Button
              onClick={handleSubmit}
              disabled={loading || !query.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Обработка...
                </>
              ) : (
                <>
                  {useLlm ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Отправить
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
