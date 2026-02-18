import { useBooleanTag } from '@/hooks/useBooleanTag';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export interface BooleanStatusItem {
  id: string;
  tagName: string;
  label: string;
  icon: string;
  description?: string;
}

export function BooleanStatusGrid({ items }: { items: BooleanStatusItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <BooleanStatusItem key={item.id} {...item} />
      ))}
    </div>
  );
}

function BooleanStatusItem({ 
  tagName, 
  label, 
  icon, 
  description 
}: BooleanStatusItem) {
  const { data, loading } = useBooleanTag(tagName);
  const value = data?.value ?? false;

  if (loading) {
    return (
      <Card className="border-2 border-slate-300 dark:border-slate-700">
        <CardContent className="pt-6 flex items-center gap-2 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border-2 transition-all ${
        value
          ? 'border-green-400 bg-green-50/50 dark:bg-green-950/30'
          : 'border-red-400 bg-red-50/50 dark:bg-red-950/30'
      }`}
    >
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Icon and Status Indicator */}
          <div className="flex items-center justify-between">
            <span className="text-3xl">{icon}</span>
            <div
              className={`w-4 h-4 rounded-full shadow-lg transition-all ${
                value ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'
              }`}
            />
          </div>

          {/* Label */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value ? '✓ HIGH' : '✗ LOW'}</p>
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}

          {/* Last Updated */}
          {data?.timestamp && (
            <p className="text-xs text-muted-foreground">
              {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
