import React from 'react';
import {c, type SceneProps} from '../design';
import {ComparePair, ExplodedLayers, interval, TraceRoute} from './Motions';
import {segments} from '../tcpModel.mjs';

function Sheet({title, subtitle, children}: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return <svg viewBox="0 0 1280 720" width="100%" height="100%" aria-label={title}
    style={{background:c.paper, fontFamily:'inherit'}}>
    <text x="80" y="111" fontSize="52" fontWeight="750" fill={c.ink}>{title}</text>
    <text x="82" y="166" fontSize="25" fill={c.ink}>{subtitle}</text>
    <line x1="80" x2="1200" y1="205" y2="205" stroke={c.line}/>
    {children}
  </svg>;
}

export function DnsRelay({motion}: Pick<SceneProps,'motion'>) {
  const query = interval(motion, 0, .45);
  const reply = motion < .55 ? -1 : interval(motion, .55, 1);
  return <Sheet title="域名查询怎样走一个来回？" subtitle="这一次，解析器的缓存里已有 example.com 的地址。">
    <g fill={c.ink} fontSize="31" fontWeight="700" textAnchor="middle">
      <text x="236" y="290">电脑</text><text x="1044" y="290">DNS 解析器</text>
    </g>
    <g fill={c.ink} fontSize="23" textAnchor="middle">
      <text x="640" y="327">查询域名 →</text><text x="640" y="467">← 返回 IP 地址</text>
    </g>
    <TraceRoute points={[[236,355],[1044,355]]} progress={query}/>
    <TraceRoute points={[[1044,493],[236,493]]} progress={reply} color={c.red}/>
    {query >= 1 && <g fill={c.teal}>
      <line x1="1044" x2="1044" y1="367" y2="477" stroke={c.line} strokeWidth="2" strokeDasharray="3 6"/>
      <rect x="978" y="400" width="132" height="40" rx="20" fill={c.pale}/>
      <text x="1044" y="428" fontSize="22" textAnchor="middle">缓存命中</text>
    </g>}
    {reply >= 1 && <text x="236" y="552" fill={c.red} fontSize="25" textAnchor="middle">已收到地址</text>}
  </Sheet>;
}

type Field = {name: string; width: number; fill: string; dark?: boolean};
function Fields({x, fields, labelled}: {x: number; fields: Field[]; labelled: boolean}) {
  let cursor = x;
  return <g>{fields.map(field => {
    const left = cursor;
    cursor += field.width;
    return <g key={field.name}>
      <rect x={left} y="-26" width={field.width} height="52" rx="5" fill={field.fill} stroke={c.paper} strokeWidth="2"/>
      {labelled && <text x={left + field.width/2} y="8" fontSize="22" fontWeight="600"
        textAnchor="middle" fill={field.dark ? c.ink : 'white'}>{field.name}</text>}
    </g>;
  })}</g>;
}
export function PacketLayers({motion}: Pick<SceneProps,'motion'>) {
  const show = motion >= .73;
  // Each child occupies exactly the payload region of its parent. Widths are schematic.
  const layers = [
    {label:'以太网帧', anchorX:298, body:<Fields x={300} labelled fields={[
      {name:'帧头',width:125,fill:c.ink},{name:'IPv4 数据报',width:600,fill:c.teal},{name:'帧尾',width:90,fill:c.ink}]}/>},
    {label:'IPv4 数据报', anchorX:423, body:<Fields x={425} labelled={show} fields={[
      {name:'IP 首部',width:145,fill:c.teal},{name:'TCP 报文段',width:455,fill:'#427265'}]}/>},
    {label:'TCP 报文段', anchorX:568, body:<Fields x={570} labelled={show} fields={[
      {name:'TCP 首部',width:145,fill:'#427265'},{name:'应用数据',width:310,fill:'#E6CA8B',dark:true}]}/>},
  ];
  return <Sheet title="一段应用数据装在哪一层？" subtitle="沿同一列向下看，每一层都展开了上一层承载的内容。宽度仅作示意。">
    <g transform="translate(0 304)">
      <ExplodedLayers layers={layers} progress={motion} gap={104} labelX={224}/>
      {show && <g stroke={c.line} strokeWidth="2" strokeDasharray="4 5" fill="none">
        <path d="M425 27v50 M1025 27v50 M570 131v50 M1025 131v50"/>
      </g>}
    </g>
  </Sheet>;
}

const arrivals = [.19, .39, .59];
function TcpRow(losesMiddle: boolean, progress: number) {
  const present = segments.map((_, i) => progress >= arrivals[i] && (!losesMiddle || i !== 1 || progress >= 1));
  const missing = present.indexOf(false);
  const prefix = missing < 0 ? segments[segments.length - 1][1] : segments[missing][0] - 1;
  const repair = interval(progress, .80, 1);
  return <g>
    {segments.map(([first,last], i) => {
      const x = 210 + 193*i;
      const flying = losesMiddle && i === 1 && repair > 0 && repair < 1;
      const gap = losesMiddle && i === 1 && progress >= arrivals[1] && !present[i];
      return <g key={first}>
        <rect x={x} y="-32" width="167" height="64" rx="7" fill="none" stroke={gap ? c.red : c.line} strokeWidth="2" strokeDasharray="6 5"/>
        {gap && !flying && <text x={x+83} y="9" textAnchor="middle" fontSize="24" fill={c.red}>缺口</text>}
        {(present[i] || flying) && <g transform={'translate(0 ' + (flying ? -56*(1-repair) : 0) + ')'}>
          <rect x={x} y="-32" width="167" height="64" rx="7" fill={last <= prefix ? c.teal : c.pale} stroke={c.teal} strokeWidth="2"/>
          <text x={x+83} y="9" textAnchor="middle" fontSize="24" fontWeight="600" fill={last <= prefix ? 'white' : c.ink}>{first}–{last}</text>
        </g>}
      </g>;
    })}
    <text x="950" y="12" fill={c.ink} textAnchor="middle" fontSize="35" fontWeight="700">{prefix} 字节</text>
  </g>;
}

export function TcpComparison({motion}: Pick<SceneProps,'motion'>) {
  return <Sheet title="同样发三段，少到一段会怎样？" subtitle="两组按相同节奏发送。只让下方第二段首次丢失，稍后补传。">
    <g transform="translate(84 340)">
      <text x="950" y="-67" textAnchor="middle" fontSize="21" fill={c.ink}>当前可按序交付</text>
      <ComparePair baseline={{label:'全部到达',value:false}} variant={{label:'中段丢失',value:true}}
        progress={motion} gap={144} draw={TcpRow}/>
    </g>
    <text x="294" y="571" fontSize="24" fill={c.ink}>
      {motion >= 1 ? '补传抵达，后面缓存的字节也连上了。'
        : motion >= .59 ? '浅色块已缓存，交付位置仍停在缺口前。' : '每块代表 100 个字节，编号为示意值。'}
    </text>
  </Sheet>;
}

export function NarratedTcpComparison({beat, localFrame, motion}: SceneProps) {
  // Establish the missing segment during speech. Only the repair travels in the Foley window.
  const start = beat.motionFrom;
  if (start === undefined || start <= 0) return <TcpComparison motion={motion}/>;
  const progress = localFrame < start ? .80 * interval(localFrame, 0, start) : .80 + .20 * motion;
  return <TcpComparison motion={progress}/>;
}
