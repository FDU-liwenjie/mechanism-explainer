import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {film} from '../design';
import {interval} from './Motions';
import {DnsRelay, PacketLayers, TcpComparison} from './NetworkScenes';

const shots = [
  {Scene:DnsRelay, seconds:6},
  {Scene:PacketLayers, seconds:5},
  {Scene:TcpComparison, seconds:7},
];
export const showcaseSeconds = shots.reduce((sum, shot) => sum + shot.seconds, 0);

function Shot({Scene, seconds}: typeof shots[number]) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = Math.round(.35 * fps);
  const contact = Math.round((seconds - 1.25) * fps);
  const motion = interval(frame, start, contact);
  const soundAt = (progress: number) => start + Math.ceil((contact - start) * progress);
  const repairTravel = soundAt(.80);
  return <>
    <Scene motion={motion}/>
    {film.actionSound && Scene === DnsRelay && [soundAt(.45), contact].map(at =>
      <Sequence key={at} from={at}><Audio src={staticFile('tap.wav')} volume={.46}/></Sequence>)}
    {film.actionSound && Scene === TcpComparison && <>
      <Sequence from={repairTravel} durationInFrames={contact-repairTravel}>
        <Audio src={staticFile('foley/slide.wav')} volume={.52}/>
      </Sequence>
      <Sequence from={contact}><Audio src={staticFile('foley/latch.wav')} volume={.8}/></Sequence>
    </>}
  </>;
}

export function SvgShowcase() {
  const {fps} = useVideoConfig();
  let cursor = 0;
  return <AbsoluteFill style={{fontFamily:'"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'}}>
    {shots.map(shot => {
      const from = cursor;
      const length = Math.round(shot.seconds * fps);
      cursor += length;
      return <Sequence key={from} from={from} durationInFrames={length}><Shot {...shot}/></Sequence>;
    })}
  </AbsoluteFill>;
}
