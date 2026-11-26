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
  const trajectory: {stroke:Stroke; x:number; start:number; end:number}[]=[];
  const signs=Array.from(text).map(c=>{
    const sign=signFor(c,data);
    const entry={sign,x,start:duration};
    let at=duration;
    for (const stroke of sign.strokes) {
      trajectory.push({stroke,x,start:at,end:at+stroke.length});
      at+=stroke.length+lift;
    }
    x+=sign.advance;
    duration+=sign.length+.1;
    return entry;
  });
  return {signs,trajectory,width:x,duration:Math.max(0,duration-.1)};
};
export const chalkTextWidth=(text:string,size:number,glyphs:GlyphData=defaultGlyphs) => layout(text,glyphs).width*size;

type Pose = {x:number;y:number;raised:number;opacity:number};
const penOnLine=(line:ReturnType<typeof layout>, at:number, x:number,y:number,size:number):Pose | undefined=>{
  const current=line.trajectory.find(piece=>at<=piece.end);
  const index=current ? line.trajectory.indexOf(current) : line.trajectory.length;
  if(current && at>=current.start){
    const p=interpolatePoint(current.stroke,at-current.start);
    return {x:x+(current.x+p[0])*size,y:y+p[1]*size,raised:0,opacity:1};
  }
  const last=line.trajectory[index-1];
  if(!last)return undefined;
  const p0=last.stroke.points[last.stroke.points.length-1];
  const end=current?.start ?? line.duration;
  const fraction=clamp((at-last.end)/Math.max(.001,end-last.end));
  const p1=current?.stroke.points[0] ?? p0;
  const raised=current ? Math.sin(Math.PI*fraction) : fraction;
  const travel=fraction*fraction*(3-2*fraction);
  const x0=p0[0]+last.x, x1=p1[0]+(current?.x ?? last.x);
  return {x:x+(x0+(x1-x0)*travel)*size+raised*4,y:y+(p0[1]+(p1[1]-p0[1])*travel)*size-raised*9,
    raised,opacity:current ? 1 : 1-fraction};
};

const Nib: React.FC<Pose & {color:string}> = ({x,y,color,raised,opacity}) =>
  <g transform={`translate(${x} ${y}) rotate(${-34-raised*5})`} opacity={opacity} pointerEvents="none" aria-hidden>
    <path d="M1 1.8 L4 -3.2 Q5 -4.1 10 -4.1 L52 -4.9 Q56 -4.7 57 0.2 Q56.8 4.8 53 5.0 L6 4.2Z"
      fill="#102924" opacity={.32-raised*.13} transform={`translate(${1+raised*3} ${2.5+raised*2.8})`}/>
    <path d="M.2 0 L3 -3.4 Q4.7 -4.8 10 -4.8 L52 -5.7 Q56.9 -5.5 57.1 -.1 Q57.4 4.5 53.3 5.7 L8 5.1 L3.5 4.2Z"
      fill="#f1ecd7" stroke="#6c766b" strokeWidth=".65"/>
    <path d="M6 -3.7 L53 -4.9 L55.3 -2.2 L8 -.4Z" fill="#fff9e8"/>
    <path d="M6 .1 Q28 1.2 54.7 -.9 L54.1 4.9 L8.4 4.6 L4.2 3.5Z" fill={color} opacity=".46"/>
    <path d="M5.6 2.6 L20.3 3 L41.9 2.6 L54.2 1.8 L53.5 5 L8.4 4.6 L3.9 3.6Z" fill="#758478" opacity=".44"/>
    <ellipse cx="53.2" cy="0" rx="3.6" ry="5.2" fill="#d8d7c4" stroke="#8e9a8a" strokeWidth=".75"/>
    <path d="M52.6 -4.3 Q56.7 -1.3 54.8 3.5" fill="none" stroke="#e9e8d3" strokeWidth="1.1"/>
    <path d="M.2 0 L3.3 -3.2 L7.3 -4.3 L5.5 -1.7 L5.8 1.3 L4.2 3.8 L2.2 2.3Z"
      fill={color} stroke="#c8c8b5" strokeWidth=".55"/>
    <path d="M10.8 -.2 l1.1 -.7 m9.2 -.9 l1.7 .2 m10.3 .3 l.9 -.8 m10.3 -1 l1.2 .3"
      stroke="#969d8f" strokeWidth=".68" strokeLinecap="round" opacity=".7"/>
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
    const pen=tip && progress<1 ? penOnLine(line,at,x,y,size) : undefined;
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
          writing=<Ink d={stroke.d} color={color} width={w} length={local}/>;
          break;
        }
        consumed+=stroke.length+lift;
      }
      return <g key={i} transform={`translate(${dx} 0)`}>{finished && <Ink d={finished} color={color} width={w}/>}{writing}</g>;
    });
    return <g><g transform={`translate(${x} ${y}) scale(${size})`}>{ink}</g>
      {pen && <Nib {...pen} color={color}/>}</g>;
  };

export const ChalkPath: React.FC<PenProps & {points:readonly Point[]}> = ({points,progress,color=chalkColors.white,width=4,tip=true})=>{
  const stroke=useMemo(()=>points.length>=2 ? measure(points) : null,[points]);
  if(progress<=0 || !stroke?.length) return null;
  const travel=clamp(progress/.94);
  const raised=clamp((progress-.94)/.06);
  const length=stroke.length*travel;
  const pen=interpolatePoint(stroke,length);
  return <g><Ink d={stroke.d} color={color} width={width} length={progress<1 ? length : undefined}/>
    {tip && progress<1 && <Nib x={pen[0]+4*raised} y={pen[1]-9*raised} color={color} raised={raised} opacity={1-raised}/>}</g>;
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
