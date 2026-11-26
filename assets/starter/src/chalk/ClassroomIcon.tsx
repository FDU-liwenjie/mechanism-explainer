import React from 'react';
import paths from './tablerPaths.json';

export type ClassroomIconName = keyof typeof paths;

export function isClassroomIcon(name: unknown): name is ClassroomIconName {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(paths, name);
}

type IconProps = {
  name: ClassroomIconName;
  size: number;
  progress: number;
  color?: string;
};

export const ClassroomIcon: React.FC<IconProps> = ({name, size, progress, color = '#f4efdc'}) => {
  if (!(progress > 0)) return null;
  const strokes = paths[name];
  const total = strokes.reduce((sum, stroke) => sum + stroke.length, 0);
  const travelled = Math.min(progress, 1) * total;
  let start = 0;

  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color}
    strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {strokes.map(({d, length}, index) => {
      const fraction = (travelled - start) / length;
      start += length;
      if (fraction <= 0) return null;
      if (progress >= 1 || fraction >= 1) return <path key={index} d={d}/>;
      return <path key={index} d={d} pathLength={1}
        strokeDasharray="1 2" strokeDashoffset={1 - fraction}/>;
    })}
  </svg>;
};
