import { useEffect, useMemo, useRef, useState } from 'react';
import { TYPE_ICONS } from './constants';
import type { ParsedGraph, UNode } from './types';

interface Props {
  parsed: ParsedGraph;
  onPick: (node: UNode) => void;
  onClose: () => void;
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const ch of haystack) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return needle.length === 0;
}

function score(label: string, q: string): number {
  if (label.startsWith(q)) return 3;
  if (label.includes(q)) return 2;
  if (isSubsequence(q, label)) return 1;
  return 0;
}

export function SearchOverlay({ parsed, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return parsed.nodes
      .map((n) => ({ n, s: score(n.label.toLowerCase(), q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || b.n.size - a.n.size)
      .slice(0, 6)
      .map((r) => r.n);
  }, [parsed, query]);

  useEffect(() => setActive(0), [query]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      onPick(results[active]);
    }
  }

  return (
    <div className="search-backdrop" onClick={onClose}>
      <div className="panel-ui search-modal" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search the universe…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
        />
        {results.length > 0 && (
          <div className="search-results">
            {results.map((n, i) => {
              const community = parsed.communityById.get(n.community);
              return (
                <button
                  key={n.id}
                  className={`search-row${i === active ? ' search-row--active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => onPick(n)}
                >
                  <span className="search-icon">{TYPE_ICONS[n.type]}</span>
                  <span className="search-label">{n.label}</span>
                  <span
                    className="legend-dot"
                    style={{ background: community?.color, color: community?.color }}
                  />
                </button>
              );
            })}
          </div>
        )}
        {query.trim() && results.length === 0 && (
          <div className="search-empty">No stars match “{query.trim()}”</div>
        )}
      </div>
    </div>
  );
}
