import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {film} from '../design';
import {chalkColors as chalk} from './Board';
import {ChalkSheet, type BoardMark} from './Lesson';
import {BoardCaption} from './PageFurniture';

export const figureLessonFrames = 840;
const catPageFrames = 304;
const gamePageFrames = figureLessonFrames - catPageFrames;

// Coordinates and frame ranges use the same board.json marks as the main Film.
// Absolute frame numbers here are local to each page, at 30 fps.
type MarkContent = BoardMark extends infer Mark
  ? Mark extends BoardMark ? Omit<Mark, 'from' | 'to'> : never
  : never;
type Stroke = [from: number, until: number, content: MarkContent];
function onPage(duration: number, strokes: Stroke[]): BoardMark[] {
  return strokes.map(([from, until, content]) => ({
    ...content, from: from / duration, to: until / duration,
  }));
}

const catPage = onPage(catPageFrames, [
  [0, 32, {kind: 'write', text: '怎么认出猫？', x: 83, y: 44, size: 61, color: chalk.yellow}],
  [33, 92, {kind: 'figure', name: 'cat-front', x: 178, y: 154, size: 334, volume: .17}],
  [92, 104, {kind: 'circle', cx: 268, cy: 290, rx: 30, ry: 22, color: chalk.yellow, volume: .23}],
  [105, 131, {kind: 'write', text: '正面有胡须', x: 218, y: 501, size: 48}],
  [132, 149, {kind: 'path', points: [[548,341],[581,336],[622,336],[661,342],[684,349],[672,338],[684,349],[668,353]], width: 3.4, color: chalk.mint}],
  [153, 212, {kind: 'figure', name: 'cat-back', x: 730, y: 154, size: 334, volume: .17}],
  [214, 248, {kind: 'write', text: '转过身看不见', x: 757, y: 501, size: 48, color: chalk.mint}],
]);

const gamePage = onPage(gamePageFrames, [
  [0, 34, {kind: 'write', text: '下一步走哪儿？', x: 83, y: 40, size: 57, color: chalk.yellow}],
  [36, 62, {kind: 'write', text: '1997 · 深蓝', x: 170, y: 124, size: 49}],
  [64, 158, {kind: 'figure', name: 'chess-search', x: 140, y: 191, size: 354, volume: .17}],
  [161, 194, {kind: 'write', text: '搜索后续局面', x: 157, y: 553, size: 43, color: chalk.mint}],
  [227, 260, {kind: 'write', text: '2016 · AlphaGo', x: 704, y: 124, size: 49}],
  [262, 480, {kind: 'figure', name: 'go-search', x: 716, y: 191, size: 354, volume: .17}],
  [481, 514, {kind: 'write', text: '先学判断，再搜索', x: 710, y: 553, size: 43, color: chalk.mint}],
]);

type Caption = [from: number, until: number, text: string];
const captions: Caption[] = [
  [0, 86, '如果只教电脑看胡须，它能认出每一只猫吗？'],
  [87, 141, '正面看，胡须很清楚。'],
  [142, 218, '还是这只猫，让它转个身。'],
  [219, 263, '胡须看不见了。'],
  [304, 368, '再看看两台赢过棋手的机器。'],
  [368, 424, '用示意棋盘看深蓝的国际象棋。'],
  [424, 493, '这匹马有两种候选走法，可以分别往后推。'],
  [531, 605, '十九年后，AlphaGo 下的是围棋。'],
  [605, 681, '它从高手棋谱和自我对弈中学习。'],
  [681, 741, '棋盘上这么多空点，先看哪里？'],
  [741, 839, '学来的判断会引导它搜索。'],
];

export const FigureLesson: React.FC = () => {
  const frame = useCurrentFrame();
  const caption = captions.find(([from, until]) => frame >= from && frame < until);
  return <AbsoluteFill style={{background: chalk.board}}>
    <Sequence from={0} durationInFrames={catPageFrames}>
      <ChalkSheet frame={frame} marks={catPage} duration={catPageFrames} eraseFrame={267} sound={film.actionSound}/>
    </Sequence>
    <Sequence from={catPageFrames} durationInFrames={gamePageFrames}>
      <ChalkSheet frame={frame - catPageFrames} marks={gamePage} duration={gamePageFrames} sound={film.actionSound}/>
    </Sequence>
    {caption && <BoardCaption text={caption[2]}/>}
  </AbsoluteFill>;
};
