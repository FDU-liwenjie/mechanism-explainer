export type Style = 'studio' | 'diagram' | 'mixed';
export type FilmStyle = Style | 'chalkboard';
export const film: {style: FilmStyle; chapters: boolean; actionSound: boolean} = {
  style: 'mixed',
  chapters: false,
  actionSound: true,
};
export const c = {paper:'#F1ECD9', ink:'#184142', teal:'#158480', red:'#CB4E34', gold:'#BF891F', line:'#A6ADA1', pale:'#DFE9DC'};
export type Beat = {
  chapter:string; scene:string; phase?:string; from:number; to:number; speech:number; text:string; action:string; audio:string;
  landing?: {afterSpeech:number; travel:number; sound?:string; travelSound?:string};
  motionFrom?:number; landAt?:number;
};
export type SceneProps = {beat:Beat; progress:number; motion:number; localFrame:number; fps:number; style:Style};
