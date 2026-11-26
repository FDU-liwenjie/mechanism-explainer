import React, {useId} from 'react';
import {useVideoConfig} from 'remotion';

// Erase the chalk only. The five adjacent felt-width sweeps follow a continuous
// alternating path so that the surface remains still and no old line reappears.
export const EraseBoard:React.FC<React.PropsWithChildren<{progress:number}>>=({progress,children})=>{
  const id='board-wipe-'+useId().replace(/[^\w-]/g,'');
  if (progress<=0) return <>{children}</>;
  if (progress>=1) return null;
  const width=1280, height=720, rows=5, band=height/rows;
  const step=progress*rows;
  const row=Math.min(rows-1,Math.floor(step));
  const u=step-row;
  const right=row%2===0;
  const traverse=Math.min(1,u/.90);
  const horizontal=traverse*traverse*(3-2*traverse);
  const turn=Math.max(0,(u-.90)/.10);
  const x=right ? -40+(width+80)*horizontal : width+40-(width+80)*horizontal;
  const y=(row+.5+turn)*band;
  const left=right?0:Math.max(0,x-24);
  const span=right?Math.max(0,x+24):width-left;
  return <>
    <defs><mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
      <rect width={width} height={height} fill="white"/>
      <rect width={width} height={row*band} fill="black"/>
      <rect x={left} y={row*band} width={span} height={band+1} fill="black"/>
    </mask></defs>
    <g mask={'url(#'+id+')'}>{children}</g>
    <g transform={'translate('+x+' '+y+') rotate('+(right?-3:3)+')'} aria-hidden>
      <rect x="-24" y={-band/2+4} width="51" height={band-3} rx="10" fill="#172b25" opacity=".34" transform="translate(3 3)"/>
      <rect x="-22" y={-band/2} width="45" height={band} rx="9" fill="#64594a"/>
      <rect x="-21" y={-band/2+2} width="40" height={band-5} rx="7" fill="#9b8669"/>
      <path d={'M-11 '+(-band/2+13)+' v'+(band-27)} fill="none" stroke="#b09a7c" strokeWidth="1.5"/>
    </g>
  </>;
};

// The chalk lesson reserves the lower sixth of the board for the spoken line.
export const BoardCaption:React.FC<{text:string}>=({text})=>{
  const {width}=useVideoConfig();
  if (!text) return null;
  return <div style={{position:'absolute',bottom:'5.6%',left:'5%',right:'5%',textAlign:'center',
    fontFamily:'"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif',fontWeight:500,
    fontSize:width*.025,lineHeight:1.24,color:'#fffaf0',whiteSpace:'nowrap',
    textShadow:'0 2px 6px #142822, 0 0 2px #142822'}}>{text}</div>;
};
