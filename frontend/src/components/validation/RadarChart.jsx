export default function RadarChart({ axes }) {
  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 60; // Increased padding to prevent label overlap
  const levels = 4;
  const axisCount = axes.length;
  const angleStep = (Math.PI * 2) / axisCount;

  const getCoordinates = (index, fraction) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = radius * fraction;
      return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPoints = axes
    .map((axis, index) => {
      const valueFraction = Math.max(0, Math.min(1, (axis.value || 0) / 10));
      const { x, y } = getCoordinates(index, valueFraction);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="h-full flex flex-col">
      <h3 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Idea Shape Across 10 Validation Pillars</h3>
      <div className="flex-1 flex items-center justify-center" style={{ minHeight: 0, maxHeight: '270px' }}>
        <div className="w-full h-full flex items-center justify-center" style={{ maxHeight: '270px', padding: '0 6px' }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" style={{ overflow: 'visible', maxHeight: '270px', maxWidth: '100%' }}>
          {/* concentric levels */}
          {Array.from({ length: levels }).map((_, levelIndex) => {
            const fraction = (levelIndex + 1) / levels;
            const points = axes
              .map((_, idx) => {
                const { x, y } = getCoordinates(idx, fraction);
                return `${x},${y}`;
              })
              .join(" ");
            return (
              <polygon
                key={`level-${levelIndex}`}
                points={points}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={1}
                opacity={0.8}
              />
            );
          })}

          {/* axis lines */}
          {axes.map((_, idx) => {
            const { x, y } = getCoordinates(idx, 1);
            return (
              <line
                key={`axis-${idx}`}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#cbd5f5"
                strokeWidth={1}
                opacity={0.7}
              />
            );
          })}

          {/* data polygon */}
          <polygon points={polygonPoints} fill="rgba(59,130,246,0.2)" stroke="#2563eb" strokeWidth={2} />

          {/* axis labels with scores */}
          {axes.map((axis, idx) => {
            const labelPos = getCoordinates(idx, 1.08);
            const scorePos = getCoordinates(idx, 1.16);
            const score = (axis.value || 0).toFixed(1);
            
            // Calculate text anchor and position based on angle to prevent overlap
            const angle = angleStep * idx - Math.PI / 2;
            const normalizedAngle = ((angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
            
            // Determine text anchor based on position around the circle
            let textAnchor = "middle";
            let dx = 0;
            let dy = 0;
            
            if (normalizedAngle < Math.PI / 6 || normalizedAngle > Math.PI * 11/6) {
              // Right side
              textAnchor = "start";
              dx = 3;
            } else if (normalizedAngle > Math.PI * 5/6 && normalizedAngle < Math.PI * 7/6) {
              // Left side
              textAnchor = "end";
              dx = -3;
            } else if (normalizedAngle > Math.PI / 6 && normalizedAngle < Math.PI * 5/6) {
              // Top half
              textAnchor = "middle";
              dy = -2;
            } else {
              // Bottom half
              textAnchor = "middle";
              dy = 2;
            }
            
            return (
              <g key={`label-${axis.label}`}>
                {/* Label */}
                <text
                  x={labelPos.x + dx}
                  y={labelPos.y + dy}
                  textAnchor={textAnchor}
                  dominantBaseline="middle"
                  fontSize="7"
                  fontWeight="600"
                  fill="#475569"
                  paintOrder="stroke"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                >
                  {axis.label}
                </text>
                {/* Score */}
                <text
                  x={scorePos.x}
                  y={scorePos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="7"
                  fontWeight="700"
                  fill="#1e293b"
                  paintOrder="stroke"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                >
                  {score}
                </text>
              </g>
            );
          })}
        </svg>
        </div>
      </div>
    </div>
  );
}

