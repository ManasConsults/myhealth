"use client";

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: Slice[];
  center?: string;
  size?: number;
}

export function MacroDonut({ slices, center, size = 120 }: Props) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  const r = 40;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = slices.map((sl) => {
    const pct = total > 0 ? sl.value / total : 0;
    const dash = pct * circumference;
    const seg = { ...sl, dash, offset, pct };
    offset += dash;
    return seg;
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 100">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="18" className="text-muted/60" />
        ) : (
          segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset + circumference / 4}
              style={{ transition: "stroke-dasharray 0.5s" }}
            />
          ))
        )}
        {center && (
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">
            {center}
          </text>
        )}
      </svg>
      <div className="flex gap-3 flex-wrap justify-center">
        {slices.map((sl) => (
          <div key={sl.label} className="flex items-center gap-1 text-xs">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: sl.color }} />
            <span className="text-muted-foreground">{sl.label}</span>
            <span className="font-medium">{sl.value}g</span>
          </div>
        ))}
      </div>
    </div>
  );
}
