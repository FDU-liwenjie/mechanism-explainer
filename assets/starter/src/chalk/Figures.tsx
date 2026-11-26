import React from 'react';
import {chalkColors as ink} from './Board';
import {ClassroomIcon, isClassroomIcon, type ClassroomIconName} from './ClassroomIcon';

const subjects = ['cat-front', 'cat-back', 'chess-search', 'go-search'] as const;
type Subject = typeof subjects[number];
export type FigureName = Subject | ClassroomIconName;

export function isFigureName(value: unknown): value is FigureName {
  return typeof value === 'string' && (
    (subjects as readonly string[]).includes(value) || isClassroomIcon(value)
  );
}

const ramp = (value: number, start: number, end: number) =>
  Math.min(1, Math.max(0, (value - start) / (end - start)));

type PenProps = {
  d: string; amount: number; color?: string; width?: number;
};

// Normalized path lengths keep reveals deterministic across seek, preview, and render.
function Pen({d, amount, color = ink.white, width = 3}: PenProps) {
  if (amount <= 0) return null;
  return <path d={d} fill="none" stroke={color} strokeWidth={width}
    strokeLinecap="round" strokeLinejoin="round" pathLength={1}
    strokeDasharray={amount < 1 ? '1 1' : undefined}
    strokeDashoffset={amount < 1 ? 1 - amount : undefined}/>;
}

const headFront = 'M68 80 Q66 61 71 32 Q72 28 77 32 L96 51 Q116 43 138 50 L157 32 Q160 30 161 37 L160 68 Q170 77 168 91 Q165 110 147 117 Q120 130 91 117 Q76 112 69 102 Q62 91 68 80Z';
const headBack = 'M68 81 Q67 56 73 33 Q74 29 78 34 L95 51 Q117 44 137 50 L156 32 Q160 30 160 36 L160 69 Q169 81 166 94 Q161 111 145 119 Q117 128 94 118 Q78 114 70 102 Q63 93 68 81Z';
const bodyFront = 'M92 115 C90 130 86 140 81 155 C72 176 72 195 83 205 C93 212 105 211 117 209 C129 212 147 212 158 204 C169 196 171 181 164 163 C161 154 154 139 151 119';
const bodyBack = 'M94 116 C96 132 84 142 77 162 C69 180 70 198 82 205 C97 215 107 212 120 211 C138 212 153 210 163 200 C172 186 163 166 157 153 C150 138 147 127 148 116';
const tail = 'M150 198 C174 206 196 195 198 176 C199 161 190 153 182 157 C177 160 178 165 183 167 C191 174 184 187 173 189 C165 192 158 188 155 187';

function Cat({back, progress: p}: {back: boolean; progress: number}) {
  const head = back ? headBack : headFront;
  const body = back ? bodyBack : bodyFront;
  const details = ramp(p, .61, .89);
  const face = ramp(p, .58, .90);
  return <g>
    <path d={body+'Z'} fill={ink.mint} opacity={.06*ramp(p,.25,.62)}/>
    <path d={head} fill={ink.white} opacity={.055*ramp(p,.10,.45)}/>
    <Pen d={body} amount={ramp(p,.23,.59)} width={3.6}/>
    <Pen d={tail} amount={ramp(p,.41,.73)} width={3.6}/>
    <Pen d={head} amount={ramp(p,.005,.32)} width={3.6}/>
    <g opacity={details} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M142 154 q10 2 14 7 m-12 2 q10 2 15 8 M183 161 q4 0 9 5 M184 187 q4 2 6 6" stroke={ink.yellow} strokeWidth="3.1"/>
      <path d="M76 43 l14 12 M145 55 l10 -12" stroke={ink.yellow} strokeWidth="2.5"/>
    </g>
    {back ? <>
      <Pen d="M103 53 q-1 6 5 12 M114 51 q0 7 5 13 M125 52 q0 6 4 10" amount={details} color={ink.yellow} width={2.8}/>
      <Pen d="M113 132 q6 8 14 9 m-19 -1 q6 8 14 9 m-32 31 q-5 7 -4 13" amount={ramp(p,.71,.98)} color={ink.mint} width={2.3}/>
    </> : <>
      <g fill={ink.white} opacity={face}>
        <ellipse cx="94" cy="85" rx="3.3" ry="4.1"/><ellipse cx="139" cy="85" rx="3.3" ry="4.1"/>
      </g>
      <path d="M112 94 Q116 91 120 94 L117 98 Q115 99 112 94Z" fill={ink.yellow} opacity={face}/>
      <Pen d="M116 99 q-2 6 -7 4 m7 -4 q2 6 7 4" amount={face} width={2.2}/>
      <Pen d="M74 91 L48 86 M75 97 L45 97 M77 102 L52 108 M153 92 L181 87 M155 97 L184 98 M153 103 L177 110"
        amount={ramp(p,.67,.94)} color={ink.white} width={2.1}/>
      <Pen d="M94 141 q4 12 3 25 l-3 27 q-1 7 8 8 q6 0 7 -5 m14 -45 l1 42 q0 7 7 7 q8 0 9 -6"
        amount={ramp(p,.76,1)} color={ink.mint} width={2.8}/>
    </>}
  </g>;
}

// Cells are indexed from a8 (0,0), so h1 at the lower right is light.
const chessUnit = 26;
const chessEdge = 16;
const chessCenter = (n: number) => chessEdge + (n + .5)*chessUnit;
const pieces = {
  king: 'M-6 8 L6 8 L5 5 L3 0 Q6 -1 6 -4 Q6 -7 2 -6 L0 -4 L-2 -6 Q-6 -7 -6 -4 Q-6 -1 -3 0 L-5 5Z M0 -5 V-11 M-3 -9 H3 M-5 5 H5',
  pawn: 'M-5 8 H5 L4 6 Q1 3 2 0 A3.5 3.5 0 1 0 -2 0 Q-1 3 -4 6Z',
  knight: 'M-8 8 H8 L7 5 C7 1 7 -3 3 -7 L0 -10 L-1 -6 L-6 -4 L-9 0 L-6 2 L-2 0 Q0 2 -2 4 L-5 6Z M-7 6 H7',
};

function ChessPiece({file, row, piece, dark = false}: {
  file: number; row: number; piece: keyof typeof pieces; dark?: boolean;
}) {
  return <g transform={'translate('+chessCenter(file)+' '+chessCenter(row)+')'}>
    <path d={pieces[piece]} fill={dark ? '#1e332d' : ink.white}
      stroke={dark ? ink.mint : '#2b453d'} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round"/>
    {piece==='knight' && <circle cx="-3" cy="-3" r="1" fill="#28433a"/>}
  </g>;
}

function KnightCandidate({to, firstLeg, progress, color}: {
  to: [number, number]; firstLeg: [number, number]; progress: number; color: string;
}) {
  if (progress<=0) return null;
  const x=chessCenter(to[0]), y=chessCenter(to[1]);
  return <g>
    <Pen d={'M'+chessCenter(2)+' '+chessCenter(5)+' L'+chessCenter(firstLeg[0])+' '+chessCenter(firstLeg[1])+' L'+x+' '+y}
      amount={ramp(progress,0,.82)} color={color} width={2.8}/>
    <circle cx={x} cy={y} r="6.6" fill="#28443b" stroke={color} strokeWidth="2.5"
      opacity={ramp(progress,.65,1)}/>
  </g>;
}

function Chess({progress:p}: {progress:number}) {
  const side = 8*chessUnit;
  const squares = Array.from({length:64},(_,index)=>{
    const row=Math.floor(index/8), file=index%8;
    if((file+row)%2) return null;
    return <rect key={index} x={chessEdge+file*chessUnit} y={chessEdge+row*chessUnit}
      width={chessUnit} height={chessUnit} fill={ink.mint} opacity={.29*ramp(p,.09+row*.019,.26+row*.019)}/>;
  });
  return <g>
    {squares}
    {Array.from({length:7},(_,i)=>{
      const offset=chessEdge+(i+1)*chessUnit;
      return <g key={i} opacity=".42">
        <Pen d={'M'+chessEdge+' '+offset+' h'+side} amount={ramp(p,.09+i*.017,.26+i*.017)} color={ink.mint} width={1}/>
        <Pen d={'M'+offset+' '+chessEdge+' v'+side} amount={ramp(p,.16+i*.017,.33+i*.017)} color={ink.mint} width={1}/>
      </g>;
    })}
    <Pen d="M16 16 H224 V224 H16Z" amount={ramp(p,0,.22)} color={ink.white} width={2.7}/>
    <g opacity={ramp(p,.35,.55)}>
      <ChessPiece file={6} row={0} piece="king" dark/><ChessPiece file={1} row={1} piece="pawn" dark/>
      <ChessPiece file={4} row={2} piece="pawn" dark/><ChessPiece file={4} row={6} piece="pawn"/>
      <ChessPiece file={6} row={7} piece="king"/>
    </g>
    <KnightCandidate to={[3,3]} firstLeg={[2,3]} progress={ramp(p,.64,.82)} color={ink.yellow}/>
    <KnightCandidate to={[4,4]} firstLeg={[4,5]} progress={ramp(p,.81,.99)} color={ink.mint}/>
    <g opacity={ramp(p,.46,.62)}>
      <circle cx={chessCenter(2)} cy={chessCenter(5)} r="11" fill={ink.yellow} opacity=".25"/>
      <ChessPiece file={2} row={5} piece="knight"/>
    </g>
  </g>;
}

// A constructed opening, Black first. Coordinates count intersections.
const goOpening = [
  [3,3],[15,15], [15,3],[3,15], [13,4],[15,13], [15,5],[4,13],
  [10,3],[5,16], [3,6],[4,9], [12,15],[13,17], [14,10],[15,9],
] as const;
const goCenter = (index:number) => 21+index*11;

function Go({progress:p}: {progress:number}) {
  const edge=goCenter(0), end=goCenter(18);
  const dots = [3,9,15];
  const choice=ramp(p,.79,.95);
  return <g>
    <rect x="13" y="13" width="214" height="214" rx="2.5" fill={ink.yellow} opacity={.07*ramp(p,0,.30)}/>
    {Array.from({length:19},(_,i)=>{
      const n=goCenter(i);
      return <g key={i} opacity={i===0||i===18 ? .97 : .73}>
        <Pen d={'M'+edge+' '+n+' H'+end} amount={ramp(p,.006*i,.18+.006*i)} color={ink.mint} width={i===0||i===18 ? 1.9 : 1.1}/>
        <Pen d={'M'+n+' '+edge+' V'+end} amount={ramp(p,.10+.006*i,.28+.006*i)} color={ink.mint} width={i===0||i===18 ? 1.9 : 1.1}/>
      </g>;
    })}
    <g fill={ink.mint} opacity={ramp(p,.27,.39)}>
      {dots.flatMap(x=>dots.map(y=><circle key={x+'-'+y} cx={goCenter(x)} cy={goCenter(y)} r="2.3"/>))}
    </g>
    {goOpening.map(([col,row],i)=>{
      const black=i%2===0, t=.30+i*.026;
      return <circle key={i} cx={goCenter(col)} cy={goCenter(row)} r="5" opacity={ramp(p,t,t+.05)}
        stroke={black ? '#c0d2bd' : '#dde6d3'} strokeWidth={black ? 1.1 : .85} fill={black ? '#101e19' : ink.white}/>;
    })}
    <g opacity={choice} fill="none" stroke={ink.yellow} strokeWidth="1.7">
      <circle cx={goCenter(13)} cy={goCenter(7)} r="5.6"/>
      <circle cx={goCenter(13)} cy={goCenter(7)} r="9.1" strokeWidth="1.1" opacity={ramp(p,.91,.99)}/>
    </g>
    <circle cx={goCenter(13)} cy={goCenter(7)} r="2.1" fill={ink.yellow} opacity={choice}/>
  </g>;
}

export type BoardFigureProps = {
  name: FigureName; x: number; y: number; size: number; progress: number;
};

export function BoardFigure({name, x, y, size, progress}: BoardFigureProps) {
  if(progress<=0 || size<=0) return null;
  const p=Math.min(1,progress);
  if(isClassroomIcon(name)) return <g transform={'translate('+x+' '+y+')'}>
    <ClassroomIcon name={name} size={size} progress={p}/>
  </g>;
  return <svg x={x} y={y} width={size} height={size} viewBox="0 0 240 240" aria-label={name}>
    {name==='chess-search' ? <Chess progress={p}/> :
     name==='go-search' ? <Go progress={p}/> :
     <Cat back={name==='cat-back'} progress={p}/>}
  </svg>;
}
