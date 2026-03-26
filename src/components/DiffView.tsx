import React from 'react';
import * as diff from 'diff';

interface DiffViewProps {
  oldText: string;
  newText: string;
}

// Tokenize text into words (including Cyrillic) and non-words (spaces, punctuation)
function tokenize(text: string): string[] {
  // Match sequences of word characters (Latin, Cyrillic, numbers, underscore) 
  // OR sequences of non-word characters.
  const regex = /([a-zA-Zа-яА-ЯёЁ0-9_]+|[^a-zA-Zа-яА-ЯёЁ0-9_]+)/g;
  return text.match(regex) || [];
}

export function DiffView({ oldText, newText }: DiffViewProps) {
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  
  // diffArrays compares array elements exactly, keeping our custom words intact
  const changes = diff.diffArrays(oldTokens, newTokens);

  return (
    <div className="w-full h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 font-mono text-sm overflow-auto whitespace-pre-wrap break-words">
      {changes.map((change, i) => {
        let className = "text-slate-800 dark:text-slate-200";
        if (change.added) className = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200";
        if (change.removed) className = "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through opacity-70";
        
        // change.value is an array of tokens because we used diffArrays
        const text = change.value.join('');
        
        return (
          <span key={i} className={className}>
            {text}
          </span>
        );
      })}
    </div>
  );
}
