import React from 'react';
import {c} from '../design';

export const unit = (value: number) => Math.max(0, Math.min(1, value));
export const interval = (value: number, start: number, end: number) =>
  unit((value - start) / (end - start));
const ease = (t: number) => t * t * (3 - 2 * t);

type Point = readonly [number, number];

// Travel is measured in SVG units so long and short legs share the same speed.
export function TraceRoute({points, progress, color = c.teal}: {
  points: readonly Point[]; progress: number; color?: string;
}) {
  if (points.length === 0) return null;
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    distances.push(distances[i - 1] + Math.hypot(x - px, y - py));
  }
  const length = distances[distances.length - 1];
  const travelled = length * unit(progress);
  const path = points.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ');
  const next = distances.findIndex(distance => distance > travelled);
  let tip = points[points.length - 1];
  if (next > 0) {
    const fraction = (travelled - distances[next - 1]) / (distances[next] - distances[next - 1]);
    const [x, y] = points[next - 1];
    tip = [x + (points[next][0] - x) * fraction, y + (points[next][1] - y) * fraction];
  }
  return <g fill="none" strokeLinejoin="round">
    <path d={path} stroke={c.line} strokeDasharray="4 7" strokeWidth="2"/>
    {travelled > 0 && <path d={path} stroke={color} strokeWidth="5" strokeDasharray={travelled + ' ' + (length + 1)}/>}
    {points.map(([x,y], i) => <circle key={i} cx={x} cy={y} r="7" strokeWidth="3"
      fill={progress >= 0 && travelled >= distances[i] ? color : c.paper} stroke={color}/>)}
    {progress >= 0 && progress < 1 && <circle cx={tip[0]} cy={tip[1]} r="9" fill={color} stroke={c.paper} strokeWidth="2"/>}
  </g>;
}

type Layer = {label: string; body: React.ReactNode; anchorX: number};
export function ExplodedLayers({layers, progress, gap, labelX}: {
  layers: readonly Layer[]; progress: number; gap: number; labelX: number;
}) {
  // Move the deepest layer first so the other layers emerge from behind the top one.
  const rows = layers.map((layer, i) => {
    const {anchorX} = layer;
    const order = (layers.length - 1 - i) / Math.max(1, layers.length - 1);
    const open = ease(interval(progress, order * .20, .53 + order * .20));
    const leader = interval(progress, .74, .88);
    return <g key={layer.label} transform={'translate(0 ' + i * gap * open + ')'}>
      {layer.body}
      {leader > 0 && <g stroke={c.ink} strokeWidth="2">
        <circle cx={anchorX} cy="0" r="3" fill={c.ink}/>
        <line x1={anchorX} x2={anchorX + (labelX + 12 - anchorX) * leader} y1="0" y2="0"/>
      </g>}
      <text x={labelX} y="8" textAnchor="end" fill={c.ink} fontSize="24"
        opacity={interval(progress, .88, 1)}>{layer.label}</text>
    </g>;
  });
  return <g>{rows.reverse()}</g>;
}

type Case<T> = {label: string; value: T};
export function ComparePair<T>({baseline, variant, progress, gap, draw}: {
  baseline: Case<T>; variant: Case<T>; progress: number; gap: number;
  draw: (value: T, progress: number) => React.ReactNode;
}) {
  return <g>{[baseline, variant].map((row,i) => <g key={i} transform={'translate(0 ' + i * gap + ')'}>
    <text x="0" y="9" fill={c.ink} fontSize="25" fontWeight="650">{row.label}</text>
    {draw(row.value, unit(progress))}
  </g>)}</g>;
}
