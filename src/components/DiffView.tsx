import React from 'react';
import * as diff from 'diff';

interface DiffViewProps {
  oldText: string;
  newText: string;
}

export function DiffView({ oldText, newText }: DiffViewProps) {
  const changes = diff.diffChars(oldText, newText);

  return (
    <div className="w-full h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 font-mono text-sm overflow-auto whitespace-pre-wrap">
      {changes.map((change, i) => {
        let className = "text-slate-800 dark:text-slate-200";
        if (change.added) className = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200";
        if (change.removed) className = "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through";
        
        return (
          <span key={i} className={className}>
            {change.value}
          </span>
        );
      })}
    </div>
  );
}
