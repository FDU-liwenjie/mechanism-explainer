import type {Beat} from '../design';
import {BoardMark, validateBoard} from './Lesson';
import {checkQuestion, QuestionCue} from './StudentQuestion';

type FrameMark<T> = T extends BoardMark ? Omit<T, 'from' | 'to'> & {frames: [number, number]} : never;
type InputMark = BoardMark | FrameMark<BoardMark>;
type RecordedTiming = {speech: number; total: number};
type PageStep = {
  page: string;
  marks: InputMark[];
  recorded?: RecordedTiming;
  eraseFrom?: number;
  question?: QuestionCue;
};
export type BoardScript = Record<string, PageStep | InputMark[]>;
const keyFor = (beat: Beat) => beat.scene + '/' + beat.phase;

function frameMap(recorded: RecordedTiming | undefined, beat: Beat) {
  const duration = beat.to-beat.from;
  if (!recorded) return (frame: number) => frame;
  if (!Number.isInteger(recorded.speech) || !Number.isInteger(recorded.total) ||
      recorded.speech < 1 || recorded.total < recorded.speech)
    throw new Error('Invalid recorded speech or beat length in ' + keyFor(beat));
  // A new voice changes the spoken portion independently of the teacher's pause.
  return (frame: number) => {
    if (!Number.isInteger(frame) || frame < 0 || frame > recorded.total)
      throw new Error('Frame outside the original recording in ' + keyFor(beat));
    if (frame <= recorded.speech) return Math.round(frame * beat.speech / recorded.speech);
    const hold = (frame-recorded.speech) / (recorded.total-recorded.speech);
    return beat.speech + Math.round(hold*(duration-beat.speech));
  };
}

function resolveMark(input: InputMark, duration: number, map: (frame:number)=>number, key: string): BoardMark {
  if (!('frames' in input)) return input;
  const {frames,...mark} = input;
  const [start,end] = frames.map(map);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start<0 || end<=start || end>duration)
    throw new Error('Invalid writing frames in ' + key);
  return {...mark, from:start/duration, to:end/duration};
}

export function preparePages(script: BoardScript, beats: Beat[], fps: number) {
  let previousPage: string | undefined;
  let carried: BoardMark[] = [];
  return beats.map((beat,index) => {
    const key = keyFor(beat);
    const entry = script[key];
    if (!entry) throw new Error('Missing board entry for ' + key);
    const step = Array.isArray(entry) ? undefined : entry;
    const page = step?.page;
    if (page === undefined || page !== previousPage) carried = [];
    const duration = beat.to-beat.from;
    const map = frameMap(step?.recorded, beat);
    const input = Array.isArray(entry) ? entry : entry.marks;
    const additions = input.map(m => resolveMark(m, duration, map, key));
    const marks = [...carried,...additions];
    validateBoard(marks,key);

    let question = step?.question;
    if (question) {
      question = {...question,fromFrame:map(question.fromFrame),toFrame:map(question.toFrame),
        lines:question.lines.map(line => ({...line,atFrame:map(line.atFrame)}))};
      checkQuestion(question,duration,key);
    }
    const next = index+1 < beats.length ? script[keyFor(beats[index+1])] : undefined;
    const change = Boolean(page && next && (Array.isArray(next) || next.page !== page));
    let eraseFrame = duration;
    if (step && (step.eraseFrom !== undefined || change)) {
      const last = Math.max(question ? question.toFrame/duration : 0,...additions.map(m => m.to));
      const fraction = step.eraseFrom ?? Math.max(last,1-Math.min(.45,1.5*fps/duration));
      if (!Number.isFinite(fraction) || fraction<last || fraction<0 || fraction>=1 || Math.round(fraction*duration)>duration-2)
        throw new Error('Please reserve a writing-free interval at the end of ' + key + ' for the board eraser');
      eraseFrame = Math.round(fraction*duration);
    }
    carried = eraseFrame === duration ? marks.map(m => ({...m,from:0,to:0})) : [];
    previousPage = page;
    return {beat,marks,question,duration,eraseFrame};
  });
}
