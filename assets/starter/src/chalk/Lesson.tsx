import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {BoardSurface, ChalkCircle, ChalkPath, ChalkWrite} from './Board';

type Timing = {from:number; to:number; color?:string; volume?:number};
export type BoardMark = Timing & (
  {kind:'write'; text:string; x:number; y:number; size:number} |
  {kind:'circle'; cx:number; cy:number; rx:number; ry:number} |
  {kind:'path'; points:[number,number][]; width?:number}
);

export function validateBoard(marks: BoardMark[], name:string) {
  if (!marks?.length) throw new Error('Missing chalkboard cues for '+name);
  for (const m of marks) {
    if (!['write','circle','path'].includes(m.kind) || !Number.isFinite(m.from) || !Number.isFinite(m.to)
        || m.from < 0 || m.to > 1 || m.from > m.to || (m.from===m.to && m.to!==0))
      throw new Error('Invalid chalk mark or interval in '+name);
  }
}

export function markFrames(m:Timing,duration:number){
  const begin=Math.min(duration-1,Math.round(m.from*duration));
  return {begin,end:Math.min(duration,Math.max(begin+1,Math.round(m.to*duration)))};
}

export const BoardPicture:React.FC<{marks:BoardMark[]; frame:number; duration:number; surface?:boolean}> =
  ({marks,frame,duration,surface=true}) => <svg width="100%" height="100%" viewBox="0 0 1280 720" style={{display:'block'}}>
    {surface && <BoardSurface/>}
    {marks.map((m,i)=>{
      const {begin,end}=markFrames(m,duration);
      const p=m.to===0 ? 1 : Math.min(1,Math.max(0,(frame-begin+1)/(end-begin)));
      if(m.kind==='write') return <ChalkWrite key={i} {...m} progress={p}/>;
      if(m.kind==='circle') return <ChalkCircle key={i} {...m} progress={p}/>;
      return <ChalkPath key={i} {...m} progress={p}/>;
    })}
  </svg>;

export const BoardSounds:React.FC<{marks:BoardMark[]; duration:number}> = ({marks,duration}) => <>
  {marks.map((m,i)=>{
    if(m.to===0 || m.volume===0) return null;
    const {begin,end}=markFrames(m,duration);
    const length=end-begin;
    const circle=m.kind==='circle';
    const level=m.volume ?? (circle ? .32 : .25);
    return <Sequence key={i} layout="none" from={begin} durationInFrames={length}>
      <Audio src={staticFile('chalk/'+(circle?'circle.wav':'write.wav'))} loop
        volume={f=>level*Math.min(1,(f+1)/3,Math.max(0,(length-f)/4))}/>
    </Sequence>;
  })}
</>;

export const ChalkSheet:React.FC<{marks:BoardMark[]; frame:number; duration:number; sound:boolean}> =
  ({marks,frame,duration,sound}) => <AbsoluteFill>
    <BoardPicture marks={marks} frame={frame} duration={duration}/>
    {sound && <BoardSounds marks={marks} duration={duration}/>}
  </AbsoluteFill>;
