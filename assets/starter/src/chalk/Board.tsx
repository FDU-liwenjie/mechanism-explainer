import React, {useMemo} from 'react';
import bundled from './glyphs.json';
import {latinGlyph, Point} from './latin';

export const chalkColors = {
  white: '#f4efdc', yellow: '#f5d58b', pink: '#edb6a2', mint: '#a7d8c5',
  chalk: '#f4efdc', gold: '#f5d58b', board: '#203f38',
};
export type GlyphData = Readonly<Record<string, ReadonlyArray<ReadonlyArray<readonly number[]>>>>;

type Stroke = {points: readonly Point[]; lengths: number[]; length: number; d: string};
type Sign = {strokes: Stroke[]; advance: number; length: number; d: string};
type PenProps = {progress: number; color?: string; width?: number; tip?: boolean};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const round = (n: number) => Number(n.toFixed(3));
const distance = (a: Point,b: Point) => Math.hypot(b[0]-a[0],b[1]-a[1]);
const commands = (pts: readonly Point[]) => pts.map((p,i)=>`${i ? 'L' : 'M'}${round(p[0])} ${round(p[1])}`).join('');
const measure = (points: readonly Point[]): Stroke => {
  const lengths = [0];
  for (let i=1; i<points.length; i++) lengths.push(lengths[i-1]+distance(points[i],points[i-1]));
  return {points,lengths,length:lengths[lengths.length-1],d:commands(points)};
};
const interpolatePoint = (stroke: Stroke, at: number): Point => {
  if (at <= 0) return stroke.points[0];
  if (at >= stroke.length) return stroke.points[stroke.points.length-1];
  const i = stroke.lengths.findIndex(n=>n >= at);
  const a = stroke.points[i-1], b = stroke.points[i];
  const frac = (at-stroke.lengths[i-1])/(stroke.lengths[i]-stroke.lengths[i-1]);
  return [a[0]+(b[0]-a[0])*frac,a[1]+(b[1]-a[1])*frac];
};
const lift = .085;
const defaultGlyphs: GlyphData = bundled.glyphs;
const signsByTable = new WeakMap<GlyphData, Map<string, Sign>>();
const signFor = (c: string, extra: GlyphData): Sign => {
  let cache = signsByTable.get(extra);
  if (!cache) {cache = new Map(); signsByTable.set(extra,cache);}
  const known = cache.get(c);
  if (known) return known;
  const han = extra[c] ?? defaultGlyphs[c];
  const latin = han ? undefined : latinGlyph(c);
  if (!han && !latin) throw new Error(`未收录板书字符「${c}」。汉字请运行 python3 tools/build_chalk_glyphs.py --text '…'；其他符号请在 chalk/latin.ts 中定义中心线。`);
  const paths = han
    ? han.map(s=>s.map(([x,y]): Point=>[x/1024,(900-y)/1024]))
    : latin!.strokes;
  const strokes = paths.filter(p=>p.length > 1).map(measure);
  const sign: Sign = {strokes, advance:latin?.advance ?? 1.025,
    length:strokes.reduce((n,s)=>n+s.length+lift,0),
    d:strokes.map(s=>s.d).join('')};
  cache.set(c,sign);
  return sign;
};
const layout = (text: string, data: GlyphData) => {
  let x=0, duration=0;
  const signs=Array.from(text).map(c=>{
    const sign=signFor(c,data);
    const entry={sign,x,start:duration};
    x+=sign.advance;
    duration+=sign.length+.1;
    return entry;
  });
  return {signs,width:x,duration:Math.max(0,duration-.1)};
};
export const chalkTextWidth=(text:string,size:number,glyphs:GlyphData=defaultGlyphs) => layout(text,glyphs).width*size;

const Nib: React.FC<{x:number;y:number;color:string}> = ({x,y,color}) =>
  <g transform={`translate(${x} ${y}) rotate(-33)`} pointerEvents="none">
    <path d="M1 2.5 L23 5 L26 2.7 L26 -1 L2 -.7 Z" fill="#0d2828" opacity=".35" transform="translate(1 2)"/>
    <path d="M0 0 L3 -3 L25 -3.6 L27 -1.7 L26.5 2.2 L3 3 Z" fill={color}/>
    <path d="M3 1.2 L26.5 .2 L26.5 2.2 L3 3 Z" fill="#344f49" opacity=".36"/>
    <path d="M4 -2 L23 -2.7" stroke="#fff9ea" opacity=".7" strokeWidth=".8"/>
  </g>;
const Ink: React.FC<{d:string;color:string;width:number;length?:number}> = ({d,color,width,length}) =>
  <path d={d} stroke={color} fill="none" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray={length === undefined ? undefined : `${round(length)} 100000`}/>;

export const ChalkWrite: React.FC<PenProps & {text:string;x:number;y:number;size?:number;glyphs?:GlyphData}> =
  ({text,x,y,size=72,progress,color=chalkColors.white,width,tip=true,glyphs=defaultGlyphs})=>{
    const line=useMemo(()=>layout(text,glyphs),[text,glyphs]);
    if (progress <= 0) return null;
    const at=clamp(progress)*line.duration;
    const w=(width ?? size*.048)/size;
    let active: Point | undefined;
    const ink=line.signs.map(({sign,x:dx,start},i)=>{
      const time=at-start;
      if (time<=0 || !sign.d) return null;
      if (time >= sign.length || progress>=1)
        return <g key={i} transform={`translate(${dx} 0)`}><Ink d={sign.d} color={color} width={w}/></g>;
      let consumed=0, finished='', writing: React.ReactNode;
      for (const stroke of sign.strokes){
        const local=time-consumed;
        if(local<=0) break;
        if(local>=stroke.length) finished+=stroke.d;
        else {
          const [px,py]=interpolatePoint(stroke,local);
          active=[x+(dx+px)*size,y+py*size];
          writing=<Ink d={stroke.d} color={color} width={w} length={local}/>;
          break;
        }
        consumed+=stroke.length+lift;
      }
      return <g key={i} transform={`translate(${dx} 0)`}>{finished && <Ink d={finished} color={color} width={w}/>}{writing}</g>;
    });
    return <g><g transform={`translate(${x} ${y}) scale(${size})`}>{ink}</g>
      {tip && active && progress<1 && <Nib x={active[0]} y={active[1]} color={color}/>}</g>;
  };

export const ChalkPath: React.FC<PenProps & {points:readonly Point[]}> = ({points,progress,color=chalkColors.white,width=4,tip=true})=>{
  const stroke=useMemo(()=>points.length>=2 ? measure(points) : null,[points]);
  if(progress<=0 || !stroke?.length) return null;
  const length=stroke.length*clamp(progress);
  const pen=interpolatePoint(stroke,length);
  return <g><Ink d={stroke.d} color={color} width={width} length={progress<1 ? length : undefined}/>
    {tip && progress<1 && <Nib x={pen[0]} y={pen[1]} color={color}/>}</g>;
};
export const ChalkCircle: React.FC<PenProps & {cx:number;cy:number;rx:number;ry:number}> = ({cx,cy,rx,ry,color=chalkColors.yellow,...props})=>{
  const points=useMemo(()=>Array.from({length:90},(_,i):Point=>{
    const a=-Math.PI*.62+i/89*Math.PI*2.055;
    return [cx+Math.cos(a)*(rx+1.7*Math.cos(a*3))+.04*ry*Math.sin(a),cy+Math.sin(a)*(ry+1.4*Math.cos(a*2))];
  }),[cx,cy,rx,ry]);
  return <ChalkPath points={points} color={color} {...props}/>;
};

// Use a fixed texture and an unmarked, full-frame writing surface at any scale.
const surfaceSpecks=Array.from({length:100},(_,i)=>{
  const a=Math.sin(i*127.1+32)*43758.5453, b=Math.sin(i*311.7+19)*27453.2998;
  return <circle key={i} cx={(a-Math.floor(a))*131} cy={(b-Math.floor(b))*123} r={i%5===0 ? .63:.34} fill={i%4===0 ? '#182f2c':'#d2cfb1'} opacity={i%6===0 ? .25:.1}/>;
});
export const BoardSurface:React.FC=()=> <g aria-hidden>
  <defs>
    <radialGradient id="chalk-board-light" cx="39%" cy="34%" r="83%"><stop stopColor="#31564b"/><stop offset=".64" stopColor="#25483e"/><stop offset="1" stopColor="#18382f"/></radialGradient>
    <pattern id="chalk-board-grain" width="131" height="123" patternUnits="userSpaceOnUse">{surfaceSpecks}</pattern>
    <filter id="chalk-board-smudge" x="-20%" y="-160%" width="140%" height="420%"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>
  <rect width="1280" height="720" fill="url(#chalk-board-light)"/>
  <g fill="none" stroke="#d0cead" strokeWidth="18" strokeLinecap="round" opacity=".037" filter="url(#chalk-board-smudge)">
    <path d="M-50 179 Q240 98 568 117 M40 197 Q300 134 530 148 M697 492 Q997 442 1290 472 M642 518 Q979 472 1285 508 M52 659 Q327 597 610 614"/>
  </g>
  <rect width="1280" height="720" fill="url(#chalk-board-grain)"/>
</g>;
