// Centerlines for Latin handwriting on a six-by-nine pen grid. Each pair is x,y;
// a space lifts the chalk. Mid-height lowercase forms preserve spelling of model names.
export type Point = readonly [number, number];
const marks: Record<string, string> = {
  A:'18045168 1666', B:'1811 114152434414 144455574818',
  C:'61513112041527385867', D:'1811 113152636456473818',
  E:'61111868 1444', F:'611118 1444', G:'62513112041527385867646444',
  H:'1118 6168 1464', I:'1151 3138 1858', J:'2161 61665647381807',
  K:'1118 611518 3458', L:'111868', M:'1811346168',
  N:'18116861', O:'315162636657483828170503122131', P:'1811 11415253544414',
  Q:'315162636657483828170503122131 4569', R:'1811 11415253544414 3458',
  S:'6251311203132444556657482817', T:'0161 3138', U:'111517283848576661',
  V:'113861', W:'01172434475661', X:'1168 6118', Y:'113461 3438', Z:'11611868',
  a:'5453342415162737475654 545658', b:'1118 1514243444555647372716',
  c:'545334241516273747', d:'615658 55543424151627374756', e:'155545443424151627374757',
  f:'1814233242 0444', g:'5453342415162737475654 54575849392918',
  h:'1118 162534445558', i:'2438 2122', j:'444748392919 4142', k:'1118 5416 3548',
  l:'213747', m:'1418 1524343538 3544545568', n:'1418 152434445558',
  o:'3424141526374756554434', p:'1419 15243444555647372716',
  q:'5453342415162737475654 5459', r:'1418 16253444', s:'5444342415254657473727',
  t:'3236374757 1454', u:'141627374756 5458', v:'143854',
  w:'04162435475664', x:'1458 5418', y:'1437475654 565748392919', z:'14541858',
  '0':'315162636657483828170503122131', '1':'13313138 1858',
  '2':'12213141525344261868', '3':'1221314152534434 3444556657482817',
  '4':'5158 511565', '5':'6111143444556657482817', '6':'514131221314161728384857565544342415',
  '7':'1161432538', '8':'312112132434445352514131 342415162738485756554434',
  '9':'55453424131221314152535556473828',
  '.':'3839', ',':'373819', ':':'3334 3738', ';':'3334 373829',
  '!':'3135 3738', '?':'122131415253433435 3738', '-':'1454', '−':'1454',
  '+':'1454 3236', '=':'1353 1656', '/':'6108', '\\':'1168',
  '(':'4132232425263748', ')':'2132434445463728',
  '[':'41212848', ']':'21414828', '《':'412438 612458', '》':'214428 416448',
  '%':'6108 211112222121 4656574746', '→':'0464 426446', '←':'6404 220426',
  '>' :'125418', '<':'521458', '×':'1357 5317', '÷':'1454 3233 3637',
  '≈':'1524344554 1726364756', '、':'2436', '。':'2636372726',
  '·':'3435', '…':'1535 5565', '“':'332324 534344', '”':'332423 534443',
  "'":'3122', '‘':'332324', '’':'332423', '—':'0464', '_':'0868', '|':'3138',
  '「':'412126', '」':'525828', '【':'41212848', '】':'21414828',
};
const aliases: Record<string,string> = {'，':',','：':':','；':';','？':'?','！':'!','（':'(','）':')','．':'.','＋':'+','％':'%','＝':'=','～':'~','－':'-','／':'/'};
marks['~']='1524344554';
// Sample a quadratic turn so the chalk tip and the painted stroke follow
// the same curve. Keep mathematical symbols and angular letters sharply jointed.
const curveTurns = (points: Point[]): Point[] => {
  if (points.length < 3) return points;
  const result: Point[] = [points[0]];
  for (let i=1; i<points.length-1; i++) {
    const a=points[i-1], b=points[i], c=points[i+1];
    const previous=Math.hypot(a[0]-b[0],a[1]-b[1]), next=Math.hypot(c[0]-b[0],c[1]-b[1]);
    if (!previous || !next) continue;
    const radius=Math.min(.12,previous*.48,next*.48);
    const from:Point=[b[0]+(a[0]-b[0])*radius/previous,b[1]+(a[1]-b[1])*radius/previous];
    const to:Point=[b[0]+(c[0]-b[0])*radius/next,b[1]+(c[1]-b[1])*radius/next];
    result.push(from);
    for (let j=1; j<=4; j++) {
      const t=j/4, u=1-t;
      result.push([u*u*from[0]+2*u*t*b[0]+t*t*to[0],u*u*from[1]+2*u*t*b[1]+t*t*to[1]]);
    }
  }
  result.push(points[points.length-1]);
  return result;
};
export const latinGlyph = (raw: string): {advance: number; strokes: Point[][]} | undefined => {
  const code = raw.codePointAt(0)!;
  const key = aliases[raw] ?? (code >= 0xff01 && code <= 0xff5e ? String.fromCodePoint(code-0xfee0) : raw);
  if (key === ' ' || raw === '　') return {advance:raw === '　' ? 1 : .35, strokes:[]};
  const pen = marks[key];
  if (!pen) return undefined;
  const narrow = ['.',',',':',';','!','i','l',"'"].includes(key);
  return {advance:narrow ? .39 : .71, strokes:pen.split(' ').map(stroke => {
    const pts: Point[] = [];
    for (let i = 0; i < stroke.length; i += 2) pts.push([Number(stroke[i])*.096+.025, Number(stroke[i+1])*.093+.095]);
    return /^[a-z0235689BCDGJOPQRSU?]$/.test(key) ? curveTurns(pts) : pts;
  })};
};
