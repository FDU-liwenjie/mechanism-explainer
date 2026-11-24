import React from 'react';
import {c, SceneProps} from './design';
import {TraceRoute} from './svg/Motions';

import {phases, segments, stateAfter} from './tcpModel.mjs';
const ranges = segments.map(([a,b]) => a + '–' + b);
const ease = (x: number) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3;
const xAt = (i: number) => 230 + 305*i;

const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t*t*(3-2*t);
};

const Brick: React.FC<{x:number; y:number; text:string; color:string; depth:number; alpha?:number}> =
({x,y,text,color,depth,alpha=1}) => <g transform={`translate(${x} ${y})`} opacity={alpha}>
  {depth > 0 && <g opacity={depth}>
    <ellipse cx="117" cy="90" rx="128" ry="14" fill={c.ink} opacity=".09"/>
    <path d="M0 0 26 -20H236L210 0Z" fill={color}/><path d="M0 0 26 -20H236L210 0Z" fill="white" opacity=".30"/>
    <path d="M210 0 236 -20V52L210 72Z" fill={color}/><path d="M210 0 236 -20V52L210 72Z" fill="black" opacity=".19"/>
  </g>}
  <rect width="210" height="72" rx={8-6*depth} fill={color}/>
  <text x="105" y="47" fill="#fff" textAnchor="middle" fontSize="31" fontWeight="700">{text}</text>
</g>;

export const TcpBuffer: React.FC<SceneProps> = ({beat,progress,motion,localFrame,fps,style}) => {
  const i = phases.indexOf(beat.phase ?? '');
  const move = beat.landing ? smooth(motion) : ease(motion);
  const landed = motion >= 1;
  const repaired = i > 5 || (i === 5 && landed);
  const delivered = i === 8 && landed;
  const state = stateAfter(beat.phase ?? '');
  // Keep the object faces registered while the tabletop dissolves to the front view.
  let depth = style === 'diagram' ? 0 : 1;
  if (style === 'mixed' && i >= 5) {
    depth = i === 5 ? 1 - smooth(localFrame / (.58 * fps)) : 0;
  }
  // Approach the destination while it is named, then widen to show the result.
  // Start and end at neutral framing so adjacent beats join without a jump.
  const focus = i === 1 ? xAt(2)+105 : xAt(1)+105;
  const lead = smooth(localFrame / (.65 * fps));
  const zoom = beat.landing && style !== 'diagram' ? 1 + .065 * lead * (1 - smooth(motion)) : 1;
  const upper = 245, lower = 454;
  const caption = i < 5 ? '少了中间一段，后面的先放在哪？' : '接收端何时可以继续交付？';
  return <svg viewBox="0 0 1280 720" width="100%" height="100%" style={{fontFamily:'inherit'}}>
    <text x="640" y="95" textAnchor="middle" fontSize="47" fontWeight="750" fill={c.ink}>{caption}</text>
    <text x="640" y="146" textAnchor="middle" fontSize="24" fill={c.ink}>每块代表 100 个字节 · 序号为示意值</text>
    <g transform={`translate(${focus} 355) scale(${zoom}) translate(${-focus} -355)`}>
    {depth > 0 && <g opacity={depth}>
      <defs>
        <linearGradient id="surface" x2=".8" y2="1"><stop stopColor="#F9F4DF"/><stop offset="1" stopColor="#CBC9AF"/></linearGradient>
      </defs>
      <ellipse cx="685" cy="541" rx="510" ry="24" fill={c.ink} opacity=".06"/>
      {[upper,lower].map(y=><g key={y}>
        <path d={`M200 ${y+96} 254 ${y-31}H1150L1096 ${y+96}Z`} fill="url(#surface)" stroke="#B5B69E" strokeWidth="2"/>
        <path d={`M200 ${y+96}H1096L1150 ${y-31}v12l-54 127H200Z`} fill="#A6AB95"/>
        {[225,1060].map(x=><circle key={x} cx={x} cy={y+87} r="4" fill="#828F7E"/>)}
      </g>)}
    </g>}
    {[upper,lower].map((y,row)=><g key={y}>
      <text x="58" y={y+45} fontSize="26" fontWeight="650" fill={c.ink}>{row?'已交给应用':'接收缓冲区'}</text>
      {ranges.map((r,k)=><rect key={r} x={xAt(k)} y={y} width="210" height="72" rx="6" fill="none" stroke={c.line} strokeWidth="2" strokeDasharray="8 7"/>)}
    </g>)}
    <Brick x={xAt(0)} y={lower} text={ranges[0]} color={c.teal} depth={depth}/>
    {i === 0 && <g opacity={1-.65*move}>
      <path d={`M${xAt(1)+105} 178v${20+22*move}`} stroke={c.red} strokeWidth="3" strokeDasharray="5 4"/>
      <text x={xAt(1)+105} y={236+move*8} textAnchor="middle" fontSize="28" fill={c.red}>×</text>
    </g>}
    {i===2 && <g>
      <TraceRoute points={[[xAt(2),330],[xAt(2)+210,330]]} progress={Math.min(1,progress*1.25)} color={c.gold}/>
      <text x={xAt(2)+105} y="373" textAnchor="middle" fontSize="23" fill={c.ink}>已缓存</text>
    </g>}
    {(i===3 || i===4) && <g transform={`translate(${i===3 ? 335+143*move : 478} 0)`}>
      <path d="M-11 438 0 451 11 438Z" fill={c.red}/>
      <text x="0" y="428" textAnchor="middle" fontSize="22" fill={c.ink}>{i===3?'读取位置':'可读至 '+state.canReadThrough}</text>
    </g>}
    {i===4 && <path d={`M${xAt(0)} 550h${210*progress}`} stroke={c.teal} strokeWidth="5"/>}
    {i < 5 && <g>
      <path d={`M${xAt(1)+105} 336v29`} stroke={c.red} strokeWidth="3"/>
      <text x={xAt(1)+105} y="397" textAnchor="middle" fill={c.red} fontSize="26" fontWeight="650">等待字节 {state.next}</text>
    </g>}
    {i >= 1 && <Brick x={xAt(2)+(i===1?(1-move)*145:0)} y={upper+(i===8?move*(lower-upper):0)} text={ranges[2]} color={c.teal} depth={depth} alpha={i===1?.25+.75*move:1}/>}
    {i===5 && !landed && <g opacity={1-move}>
      <rect x={xAt(1)} y={upper} width="210" height="72" rx="6" fill="none" stroke={c.red} strokeWidth="3" strokeDasharray="8 7"/>
      <text x={xAt(1)+105} y="400" textAnchor="middle" fill={c.red} fontSize="26">等待字节 101</text>
    </g>}
    {i >= 5 && <Brick x={xAt(1)} y={upper-(i===5?(1-move)*73:0)+(i===8?move*(lower-upper):0)} text={ranges[1]} color={c.teal} depth={depth} alpha={i===5?.65+.35*move:1}/>}
    {(i===6 || i===7) && <g opacity={i===7?1-move:move}>
      <rect x={xAt(1)+31} y="344" width="150" height="52" rx="5" fill={c.paper} stroke={c.red} strokeDasharray="5 4" strokeWidth="2"/>
      <text x={xAt(1)+106} y="378" textAnchor="middle" fontSize="21" fill={c.red}>101–200 · 副本</text>
    </g>}
    {repaired && (i===5 || i===8) && <text x="640" y="407" textAnchor="middle" fontSize="26" fill={c.ink}>{delivered?'已交付 1–'+state.canReadThrough:'1–'+state.canReadThrough+' 已连续到达'}</text>}
    </g>
  </svg>;
};
