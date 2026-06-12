import type { CommunityInfo } from './types';

interface Props {
  communities: CommunityInfo[]; // already sorted by count desc
  onPick: (communityId: number) => void;
}

export function ClusterLegend({ communities, onPick }: Props) {
  return (
    <div className="panel-ui legend">
      <div className="legend-title">CLUSTERS — CLICK TO VISIT</div>
      <div className="legend-list">
        {communities.map((c) => (
          <button key={c.id} className="legend-row" onClick={() => onPick(c.id)}>
            <span className="legend-dot" style={{ background: c.color, color: c.color }} />
            <span className="legend-name">{c.name}</span>
            <span className="legend-count">{c.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
