import React from 'react';
import {ChalkWrite, chalkColors, chalkTextWidth} from './Board';

export type QuestionCue = {
  fromFrame: number;
  toFrame: number;
  lines: {atFrame: number; text: string}[];
  x?: number;
  y?: number;
};

export function checkQuestion(cue: QuestionCue, duration: number, name: string) {
  const where = `Invalid student question in ${name}`;
  if (!Number.isInteger(cue.fromFrame) || !Number.isInteger(cue.toFrame) ||
      cue.fromFrame < 0 || cue.toFrame > duration || cue.fromFrame >= cue.toFrame)
    throw new Error(`${where}: set a frame interval within this beat`);
  if (!Array.isArray(cue.lines) || cue.lines.length < 1 || cue.lines.length > 2)
    throw new Error(`${where}: use one or two short lines`);
  let last = cue.fromFrame - 1;
  for (const line of cue.lines) {
    if (!line.text?.trim() || !Number.isInteger(line.atFrame) || line.atFrame <= last || line.atFrame >= cue.toFrame)
      throw new Error(`${where}: order the lines by their spoken cues`);
    if (chalkTextWidth(line.text, 33) > 354)
      throw new Error(`${where}: split or shorten “${line.text}” so it remains readable`);
    last = line.atFrame;
  }
}

const fade = (n: number) => Math.max(0, Math.min(1, n));

// Coordinates identify the top-left of a 520×175 group on the 1280×720 board.
// The student's hand and gaze direct the viewer to the thought, then leave with it.
export const StudentQuestion: React.FC<QuestionCue & {frame: number}> = ({
  frame, fromFrame, toFrame, lines, x = 585, y = 295,
}) => {
  if (frame < fromFrame || frame >= toFrame) return null;
  const rise = fade((frame - fromFrame + 1) / 6);
  const opacity = Math.min(rise, fade((toFrame - frame) / 5));
  const size = Math.min(44,...lines.map(line => 354/chalkTextWidth(line.text,1)));
  const mid = lines.length === 1 ? 73-size/2 : 50-size/2;
  return <g transform={`translate(${x} ${y + 4 * (1-rise)})`} opacity={opacity}>
    <g stroke={chalkColors.mint} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeWidth="2.8">
      <path d="M13 113 Q7 91 21 81 Q38 71 53 84 Q64 98 53 120 Q45 131 32 128 Q20 127 13 113Z" fill="#34564b"/>
      <path d="M12 102 Q15 90 23 87 Q23 93 29 95 Q34 87 40 88 Q46 95 56 94" strokeWidth="2"/>
      <g fill={chalkColors.white} stroke="none"><circle cx="31" cy="105" r="2.7"/><circle cx="45" cy="103" r="2.7"/></g>
      <path d="M34 116 q4 -3 8 -1 M2 164 Q5 139 24 137 L32 141 L42 136 Q57 136 67 117 l5 -11 q4 -4 6 0 l-1 6 l4 -2 q4 -1 3 3 l-6 13 q-8 18 -26 27 M17 156 l-1 8 M43 157 l1 7"/>
      <circle cx="76" cy="86" r="3" fill={chalkColors.mint}/><ellipse cx="91" cy="78" rx="7" ry="5" fill="#375b4e"/>
      <path d="M118 107 C95 101 92 82 100 68 C89 48 102 29 124 27 C132 8 155 4 176 13 C194 -2 221 0 240 10 C263 -2 289 -1 308 10 C330 0 357 2 375 12 C401 1 426 7 441 22 C465 15 489 25 493 44 C513 48 522 67 510 84 C518 104 500 123 476 122 C461 141 436 144 413 134 C390 146 365 145 346 137 C325 146 298 144 277 137 C249 147 222 144 204 136 C176 145 152 139 142 125 C127 128 118 119 118 107Z" fill="#33594e" strokeWidth="3.3"/>
    </g>
    {lines.map(({atFrame,text},i) => <g key={atFrame} opacity={fade((frame-atFrame+1)/4)}>
      <ChalkWrite x={305-chalkTextWidth(text,size)/2} y={mid+i*49} text={text} size={size} progress={1}
        color={i === lines.length-1 ? chalkColors.yellow : chalkColors.white} tip={false}/>
    </g>)}
  </g>;
};
