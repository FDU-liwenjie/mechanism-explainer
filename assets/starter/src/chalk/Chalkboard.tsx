import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {BoardSurface, ChalkCircle, ChalkWrite, chalkColors} from './Board';

export const chalkboardSeconds = 22;
type Cue = {text: string; x:number; y:number; size:number; first:number; last:number; color?:string};
const lines: Cue[] = [
  {text:'多做对几道题？', x:239, y:83, size:75, first:4, last:173},
  {text:'原来   2', x:242, y:233, size:81, first:212, last:279},
  {text:'现在   3', x:689, y:233, size:81, first:312, last:384},
  {text:'3 − 2 = 1', x:365, y:433, size:97, first:425, last:514, color:chalkColors.yellow},
];
const circle={first:548,last:590};
const progress=(f:number,a:number,b:number)=>Math.min(1,Math.max(0,(f-a)/(b-a)));
const sound=(first:number,last:number,file:string,volume:number,loop:boolean)=>
  <Sequence from={first+1} durationInFrames={last-first} layout="none">
    <Audio src={staticFile('chalk/'+file)} loop={loop} volume={frame=>
      volume*Math.min(1,(frame+1)/3,(last-first-frame)/4)}/>
  </Sequence>;

export const Chalkboard:React.FC=()=>{
  const f=useCurrentFrame();
  return <AbsoluteFill style={{backgroundColor:chalkColors.board}}>
    <svg width="100%" height="100%" viewBox="0 0 1280 720">
      <BoardSurface/>
      {lines.map(l=><ChalkWrite key={l.first} {...l} progress={progress(f,l.first,l.last)}/>)}
      <ChalkCircle cx={814} cy={482} rx={48} ry={61} color={chalkColors.pink}
        progress={progress(f,circle.first,circle.last)}/>
    </svg>
    {lines.map(l=><React.Fragment key={l.first}>{sound(l.first,l.last,'write.wav',.46,true)}</React.Fragment>)}
    {sound(circle.first,circle.last,'circle.wav',.35,false)}
  </AbsoluteFill>;
};
