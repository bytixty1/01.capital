import { LANG_COLORS, TYPE_ICONS } from './constants';
import type { ParsedGraph, UNode } from './types';

interface Props {
  node: UNode;
  parsed: ParsedGraph;
  onClose: () => void;
  onNavigate: (node: UNode) => void;
}

export function NodeDetailPanel({ node, parsed, onClose, onNavigate }: Props) {
  const community = parsed.communityById.get(node.community);
  const adj = parsed.adjacency.get(node.id);
  const inCount = adj?.inIds.length ?? 0;
  const outCount = adj?.outIds.length ?? 0;

  // connected nodes: outbound first, then inbound, unique, capped at 8
  const connectedIds = [...new Set([...(adj?.outIds ?? []), ...(adj?.inIds ?? [])])].slice(0, 8);
  const connected = connectedIds
    .map((id) => parsed.nodeById.get(id))
    .filter((n): n is UNode => n !== undefined);

  return (
    <div className="panel-ui detail">
      <button className="detail-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="detail-badges">
        <span
          className="badge badge-type"
          style={{ background: community?.color ?? '#6366F1' }}
        >
          {node.type.toUpperCase()}
        </span>
        {node.language !== 'other' && (
          <span
            className="badge badge-lang"
            style={{ color: LANG_COLORS[node.language], borderColor: LANG_COLORS[node.language] }}
          >
            {node.language.toUpperCase()}
          </span>
        )}
        {node.kind !== 'code' && <span className="badge badge-kind">{node.kind.toUpperCase()}</span>}
      </div>

      <div className="detail-label">{node.label}</div>
      {node.filePath && <div className="detail-path">{node.filePath}</div>}

      {community && (
        <div className="detail-cluster">
          <span className="detail-cluster-bar" style={{ background: community.color }} />
          <span>{community.name}</span>
        </div>
      )}

      <div className="detail-stats">
        {inCount} inbound · {outCount} outbound
      </div>

      {connected.length > 0 && (
        <>
          <div className="detail-section-title">CONNECTED</div>
          <div className="detail-connected">
            {connected.map((n) => (
              <button key={n.id} className="detail-connected-row" onClick={() => onNavigate(n)}>
                <span className="detail-connected-icon">{TYPE_ICONS[n.type]}</span>
                <span className="detail-connected-label">{n.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
