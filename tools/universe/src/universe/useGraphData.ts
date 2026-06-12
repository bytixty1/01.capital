import { useEffect, useState } from 'react';
import { parseGraph } from './dataParser';
import type { ParsedGraph } from './types';

interface GraphDataState {
  status: 'loading' | 'ready' | 'error';
  data: ParsedGraph | null;
  error: string | null;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

export function useGraphData(): GraphDataState {
  const [state, setState] = useState<GraphDataState>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // graph.json is required; labels, manifest, and report are optional extras.
      const [graphRes, labelsRes, manifestRes, reportRes] = await Promise.allSettled([
        fetchJson('/graphify-out/graph.json'),
        fetchJson('/graphify-out/.graphify_labels.json'),
        fetchJson('/graphify-out/manifest.json'),
        fetchText('/graphify-out/GRAPH_REPORT.md'),
      ]);
      if (cancelled) return;

      if (graphRes.status === 'rejected') {
        setState({
          status: 'error',
          data: null,
          error: `Could not load graphify-out/graph.json — run /graphify first, and start this app from tools/universe. (${String(graphRes.reason)})`,
        });
        return;
      }

      // manifest.json in this corpus is a per-file extraction manifest (no counts) —
      // fetched for completeness; node/edge counts come from the parsed graph.
      void manifestRes;

      try {
        const parsed = parseGraph(
          graphRes.value as Parameters<typeof parseGraph>[0],
          labelsRes.status === 'fulfilled'
            ? (labelsRes.value as Record<string, unknown>)
            : null,
          reportRes.status === 'fulfilled' ? reportRes.value : null,
        );
        setState({ status: 'ready', data: parsed, error: null });
      } catch (err) {
        setState({
          status: 'error',
          data: null,
          error: `Failed to parse graph.json: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
