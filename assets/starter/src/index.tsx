import React from 'react';
import {AbsoluteFill, Audio, Composition, Sequence, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import timeline from '../script/timeline.json';
import {Beat, c, film, SceneProps, FilmStyle} from './design';
import {Chalkboard} from './chalk/Chalkboard';
import {TcpBuffer} from './TcpBuffer';
import {DnsRelay, NarratedTcpComparison, PacketLayers} from './svg/NetworkScenes';
import {showcaseSeconds, SvgShowcase} from './svg/Showcase';

// Register each new topic's scene here. A scene receives the active narration beat.
const scenes: Record<string, React.FC<SceneProps>> = {
  'tcp-buffer': TcpBuffer,
  'dns-relay': DnsRelay,
  'packet-layers': PacketLayers,
  'tcp-compare': NarratedTcpComparison,
};
const beats: Beat[] = timeline.beats;
const chapterCuts = beats.filter((b,i) => i===0 || b.chapter!==beats[i-1].chapter);
const Frame: React.FC<{style:FilmStyle}> = ({style}) => {
  const frame = useCurrentFrame();
  const b = beats.find(b => frame >= b.from && frame < b.to);
  if (!b) throw new Error('Uncovered frame ' + frame);
  if (style==='chalkboard') return <Chalkboard/>;
  const narration = beats.map((cue) => <Sequence key={cue.from} from={cue.from} durationInFrames={cue.speech}>
      <Audio src={staticFile(cue.audio)}/>
    </Sequence>);
  const Scene = scenes[b.scene];
  if (!Scene) throw new Error('Unregistered scene ' + b.scene);
  const localFrame = frame - b.from;
  const progress = Math.min(1, localFrame / Math.max(1,b.speech-1));
  const motion = b.motionFrom !== undefined && b.landAt !== undefined
    ? Math.max(0, Math.min(1, (localFrame - b.motionFrom) / (b.landAt - b.motionFrom)))
    : Math.min(1, progress / .72);
  return <AbsoluteFill style={{color:c.ink,background:c.paper,fontFamily:'"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'}}>
    <Scene beat={b} progress={progress} motion={motion} localFrame={localFrame} fps={timeline.fps} style={style}/>
    {narration}
    {film.actionSound && beats.map(cue => {
      if (!cue.landing || cue.motionFrom === undefined || cue.landAt === undefined) return null;
      const contact = cue.from + cue.landAt;
      const start = cue.from + cue.motionFrom;
      return <React.Fragment key={cue.from}>
        {cue.landing.travelSound && <Sequence from={start} durationInFrames={contact-start}>
          <Audio src={staticFile(cue.landing.travelSound)} volume={.52}/>
        </Sequence>}
        {cue.landing.sound && <Sequence from={contact} durationInFrames={cue.to-contact}>
          <Audio src={staticFile(cue.landing.sound)} volume={.8}/>
        </Sequence>}
      </React.Fragment>;
    })}
    {frame < b.from+b.speech && <div style={{position:'absolute',bottom:'8%',width:'90%',left:'5%',textAlign:'center',fontSize:45,lineHeight:1.2,fontWeight:550}}>{b.text}</div>}
    {film.chapters && <div style={{position:'absolute',left:'5%',right:'5%',bottom:'2%',display:'flex',gap:8}}>
      {chapterCuts.map((ch,i)=>{
        const end = chapterCuts[i+1]?.from ?? timeline.total;
        const active = frame >= ch.from && frame < end;
        const fraction = Math.max(0, Math.min(1,(frame+1-ch.from)/(end-ch.from)));
        return <div key={ch.from} style={{flex:end-ch.from,color:active?c.ink:'#556660',fontSize:22}}>
          {ch.chapter}<div style={{height:4,background:'#CDD0C1'}}><div style={{height:'100%',background:c.teal,width:(fraction*100)+'%'}}/></div>
        </div>;
      })}
    </div>}
  </AbsoluteFill>;
};
const Root = () => <>{(['Film','Studio','Diagram'] as const).map(id =>
  <Composition key={id} id={id} width={1920} height={1080} fps={timeline.fps} durationInFrames={timeline.total}
    component={Frame} defaultProps={{style:id==='Film'?film.style:id==='Studio'?'studio':'diagram'}}/>
)}
  <Composition id="Chalkboard" width={1920} height={1080} fps={timeline.fps} durationInFrames={timeline.total} component={Chalkboard}/>
  <Composition id="SvgMotions" width={1920} height={1080} fps={30} durationInFrames={showcaseSeconds * 30} component={SvgShowcase}/>
</>;
registerRoot(Root);
