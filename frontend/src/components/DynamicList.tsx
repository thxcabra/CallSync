import type { ReactNode } from 'react';
import { Button } from './ui';

interface DynamicListProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  newItem: () => T;
  render: (item: T, update: (patch: Partial<T>) => void, remove: () => void, index: number) => ReactNode;
  addLabel?: string;
}

export function DynamicList<T>({ items, onChange, newItem, render, addLabel = '+ Adicionar' }: DynamicListProps<T>) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const update = (patch: Partial<T>) => {
          const next = [...items];
          next[i] = { ...item, ...patch };
          onChange(next);
        };
        const remove = () => onChange(items.filter((_, j) => j !== i));
        return <div key={i}>{render(item, update, remove, i)}</div>;
      })}
      <Button type="button" variant="ghost" onClick={() => onChange([...items, newItem()])} className="text-xs">
        {addLabel}
      </Button>
    </div>
  );
}
