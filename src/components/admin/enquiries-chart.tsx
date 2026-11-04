"use client";

import { useEffect, useId, useRef, useState } from "react";

type Point = { date: string; count: number };

const DEFAULT_WIDTH = 720;
const HEIGHT = 240;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;

const LINE = "#0f8696"; // primary-600
const GRID = "#e4e9f0"; // line
const LABEL = "#64748b"; // slate-500

function niceMax(max: number): number {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = magnitude / 2;
  return Math.ceil(max / step) * step;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Area chart of daily enquiries with a hover/focus tooltip. */
export function EnquiriesChart({ data, label = "Enquiries per day" }: { data: Point[]; label?: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  // Drawn at the container's real pixel width, so labels stay 11px on a
  // phone instead of shrinking with a scaled-down viewBox.
  const [WIDTH, setWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width > 0) setWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const yMax = niceMax(Math.max(...data.map((d) => d.count), 1));

  const xFor = (i: number) => PAD_LEFT + (data.length === 1 ? plotWidth / 2 : (i / (data.length - 1)) * plotWidth);
  const yFor = (value: number) => PAD_TOP + plotHeight - (value / yMax) * plotHeight;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(d.count)}`).join(" ");
  const areaPath = `${linePath} L${xFor(data.length - 1)},${PAD_TOP + plotHeight} L${xFor(0)},${PAD_TOP + plotHeight} Z`;

  const yTicks = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax];
  // Thin the date labels so a 30-day range never crowds the axis.
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(plotWidth / 72)));
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  function handlePointerMove(event: React.PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = PAD_LEFT + ((event.clientX - rect.left) / rect.width) * plotWidth;
    let nearest = 0;
    let nearestDist = Infinity;
    data.forEach((_, i) => {
      const dist = Math.abs(xFor(i) - relativeX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${label}: ${total} in total over ${data.length} days`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={LINE} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke={GRID}
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : "3 4"}
            />
            <text
              x={PAD_LEFT - 10}
              y={yFor(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill={LABEL}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={LINE} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />

        {hoverIndex !== null && (
          <line
            x1={xFor(hoverIndex)}
            x2={xFor(hoverIndex)}
            y1={PAD_TOP}
            y2={PAD_TOP + plotHeight}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {data.map((d, i) =>
          plotWidth / data.length >= 24 || i === hoverIndex ? (
            <circle
              key={d.date}
              cx={xFor(i)}
              cy={yFor(d.count)}
              r={i === hoverIndex ? 5 : 3.5}
              fill={i === hoverIndex ? LINE : "#ffffff"}
              stroke={LINE}
              strokeWidth={2}
            />
          ) : null,
        )}

        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text
              key={d.date}
              x={xFor(i)}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              fontSize={11}
              fill={LABEL}
            >
              {shortDate(d.date)}
            </text>
          ) : null,
        )}

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && hoverIndex !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl bg-navy-900 px-3 py-2 text-xs text-white shadow-pop"
          style={{
            left: `${(xFor(hoverIndex) / WIDTH) * 100}%`,
            top: `${(yFor(hovered.count) / HEIGHT) * 100}%`,
          }}
        >
          <p className="font-semibold tabular-nums">
            {hovered.count} {hovered.count === 1 ? "enquiry" : "enquiries"}
          </p>
          <p className="text-white/70">
            {new Date(`${hovered.date}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      )}

      {/* The same numbers for screen readers and keyboard users. */}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Enquiries</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{shortDate(d.date)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
