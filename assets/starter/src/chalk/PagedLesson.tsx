import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Beat,film} from '../design';
import timeline from '../../script/timeline.json';
import raw from '../../script/board.json';
import {ChalkSheet} from './Lesson';
import {BoardCaption} from './PageFurniture';
import {preparePages, BoardScript} from './boardPlan';

// Speech in the starter is recorded once per beat. Longer author-written beats
// get short clauses that fit one line; the spoken clock controls their display.
function captionFor(beat:Beat,local:number) {
  if (local>=beat.speech || local<0) return '';
  const clauses=beat.text.match(/[^，、。！？；：,!?;:]+[，、。！？；：,!?;:]*/gu)??[beat.text];
  const parts:string[]=[];
  for (const clause of clauses) {
    for (const chunk of clause.match(/.{1,28}/gu)??[]) {
      if (parts.length && (parts[parts.length-1]+chunk).length<=28) parts[parts.length-1]+=chunk;
      else parts.push(chunk);
    }
  }
  const length=parts.reduce((sum,p)=>sum+p.length,0);
  let index=local*length/beat.speech;
  for (const p of parts) { if(index<p.length) return p; index-=p.length; }
  return parts[parts.length-1]??'';
}

export const PagedLesson:React.FC=()=>{
  const frame=useCurrentFrame();
  const shots=useMemo(()=>preparePages(raw as unknown as BoardScript,timeline.beats,timeline.fps),[]);
  const active=shots.find(({beat})=>frame>=beat.from && frame<beat.to);
  if (!active) throw new Error('Uncovered chalkboard frame '+frame);
  const {beat,duration,marks,question,eraseFrame}=active;
  return <AbsoluteFill>
    <Sequence from={beat.from} durationInFrames={duration}>
      <ChalkSheet marks={marks} question={question} frame={frame-beat.from} duration={duration} eraseFrame={eraseFrame} sound={film.actionSound}/>
    </Sequence>
    <BoardCaption text={captionFor(beat,frame-beat.from)}/>
    {timeline.beats.map(b=><Sequence key={b.from} from={b.from} durationInFrames={b.speech} layout="none">
      <Audio src={staticFile(b.audio)}/>
    </Sequence>)}
  </AbsoluteFill>;
};
