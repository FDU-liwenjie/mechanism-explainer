import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, staticFile} from 'remotion';
import {BoardSurface, ChalkCircle, ChalkPath, ChalkWrite} from './Board';
import {EraseBoard} from './PageFurniture';
import {QuestionCue, StudentQuestion} from './StudentQuestion';
import {BoardFigure, isFigureName, type FigureName} from './Figures';

type Timing = {from:number; to:number; color?:string; volume?:number};
export type BoardMark = Timing & (
  {kind:'write'; text:string; x:number; y:number; size:number} |
  {kind:'circle'; cx:number; cy:number; rx:number; ry:number} |
  {kind:'path'; points:[number,number][]; width?:number} |
  {kind:'figure'; name:FigureName; x:number; y:number; size:number} |
  {kind:'image'; src:string; x:number; y:number; width:number; height:number; alt?:string}
);

export function validateBoard(marks: BoardMark[], name:string) {
  if (!marks?.length) throw new Error('Missing chalkboard cues for '+name);
  for (const m of marks) {
    if (!['write','circle','path','figure','image'].includes(m.kind) || !Number.isFinite(m.from) || !Number.isFinite(m.to)
        || m.from < 0 || m.to > 1 || m.from > m.to || (m.from===m.to && m.to!==0))
      throw new Error('Invalid chalk mark or interval in '+name);
    if (m.kind==='figure' || m.kind==='image') {
      if (![m.x,m.y].every(Number.isFinite)) throw new Error('Invalid illustration position in '+name);
      if (m.kind==='figure' && (!isFigureName(m.name) || !Number.isFinite(m.size) || m.size<=0))
        throw new Error('Unknown illustration or invalid size in '+name+': '+m.name);
      if (m.kind==='image' && (typeof m.src!=='string' || !m.src.trim() ||
          /^(?:[a-z][a-z\d+.-]*:|\/)|[\\?#]|(?:^|\/)\.\.(?:\/|$)/i.test(m.src) ||
          ![m.width,m.height].every(n=>Number.isFinite(n) && n>0))) {
        throw new Error('Use a file relative to public/ and positive image dimensions in '+name);
      }
    }
  }
}

export function markFrames(m:Timing,duration:number){
  const begin=Math.min(duration-1,Math.round(m.from*duration));
  return {begin,end:Math.min(duration,Math.max(begin+1,Math.round(m.to*duration)))};
}

export const BoardPicture:React.FC<{marks:BoardMark[]; frame:number; duration:number; surface?:boolean; erase?:number; question?:QuestionCue}> =
  ({marks,frame,duration,surface=true,erase=0,question}) => <svg width="100%" height="100%" viewBox="0 0 1280 720" style={{display:'block'}}>
    {surface && <BoardSurface/>}
    <EraseBoard progress={erase}>{marks.map((m,i)=>{
      const {begin,end}=markFrames(m,duration);
      const p=m.to===0 ? 1 : Math.min(1,Math.max(0,(frame-begin+1)/(end-begin)));
      if (m.kind==='figure') return <BoardFigure key={i} name={m.name} x={m.x} y={m.y} size={m.size} progress={p}/>;
      if (m.kind==='image') return p>0 && <foreignObject key={i} x={m.x} y={m.y}
        width={m.width} height={m.height} opacity={p}>
        <Img src={staticFile(m.src)} alt={m.alt??''} style={{width:'100%',height:'100%',objectFit:'contain',display:'block'}}/>
      </foreignObject>;
      if(m.kind==='write') return <ChalkWrite key={i} {...m} progress={p}/>;
      if(m.kind==='circle') return <ChalkCircle key={i} {...m} progress={p}/>;
      return <ChalkPath key={i} {...m} progress={p}/>;
    })}</EraseBoard>
    {question && <StudentQuestion frame={frame} {...question}/>}
  </svg>;

export const BoardSounds:React.FC<{marks:BoardMark[]; duration:number}> = ({marks,duration}) => <>
  {marks.map((m,i)=>{
    if(m.to===0 || m.volume===0 || m.kind==='image') return null;
    const {begin,end}=markFrames(m,duration);
    const length=end-begin;
    const circle=m.kind==='circle';
    const level=m.volume ?? (circle ? .43 : .38);
    return <Sequence key={i} layout="none" from={begin} durationInFrames={length}>
      <Audio src={staticFile('chalk/'+(circle?'circle.wav':'write.wav'))} loop
        volume={f=>level*Math.min(1,(f+1)/3,Math.max(0,(length-f)/4))}/>
    </Sequence>;
  })}
</>;

export const ChalkSheet:React.FC<{marks:BoardMark[]; frame:number; duration:number; sound:boolean; eraseFrame?:number; question?:QuestionCue}> =
  ({marks,frame,duration,sound,eraseFrame=duration,question}) => <AbsoluteFill>
    <BoardPicture marks={marks} frame={frame} duration={duration} question={question}
      erase={Math.max(0,(frame-eraseFrame)/Math.max(1,duration-1-eraseFrame))}/>
    {sound && <BoardSounds marks={marks} duration={duration}/>}
    {sound && eraseFrame<duration && <Sequence from={eraseFrame} durationInFrames={duration-eraseFrame} layout="none">
      <Audio src={staticFile('chalk/erase.wav')} volume={.58}/>
    </Sequence>}
  </AbsoluteFill>;
