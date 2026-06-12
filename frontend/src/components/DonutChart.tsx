export interface DonutSlice {
  pct: number;
  color: string;
  /** Optional — callers that drive a hover legend attach labels to slices. */
  label?: string;
}

/**
 * Shared ownership donut. Interactive when `onHover` is provided
 * (pointer cursor + snappier easing), static otherwise.
 */
export function DonutChart({
  slices,
  size = 88,
  onHover,
}: {
  slices: DonutSlice[];
  size?: number;
  onHover?: (sliceIndex: number | null) => void;
}) {
  const r = 36;
  const cx = 44;
  const cy = 44;
  const circ = 2 * Math.PI * r;
  const interactive = onHover !== undefined;

  // Prefix-sum per slice instead of a running accumulator — the React Compiler
  // (react-hooks/immutability) forbids reassignment in render scope. Slice
  // counts are tiny (≤8), so the quadratic sum is free.
  const arcs = slices.map((s, i) => {
    const startPct = slices.slice(0, i).reduce((sum, prev) => sum + prev.pct, 0);
    return {
      color: s.color,
      dash: (s.pct / 100) * circ,
      rotation: (startPct / 100) * 360 - 90,
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 88"
      style={interactive ? { overflow: 'visible' } : undefined}
    >
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
      {arcs.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="10"
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          style={{
            transform: `rotate(${s.rotation}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: interactive
              ? 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'all 0.6s ease',
            ...(interactive ? { cursor: 'pointer' } : {}),
          }}
          onMouseEnter={interactive ? () => onHover(i) : undefined}
          onMouseLeave={interactive ? () => onHover(null) : undefined}
        />
      ))}
    </svg>
  );
}
