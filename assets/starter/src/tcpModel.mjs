// A teaching example uses relative byte numbers, inclusive segment endpoints and an app read event.
export const phases = ['missing','arrival','buffer','blocked','hold','repair','duplicate','discard','deliver'];
export const segments = [[1,100],[101,200],[201,300]];
export function stateAfter(phase) {
  const at = phases.indexOf(phase);
  if (at < 0) throw new Error('Unknown TCP phase: ' + phase);
  const received = new Set();
  let duplicates = 0;
  function receive([first,last]) {
    for (let seq = first; seq <= last; seq++) {
      if (received.has(seq)) duplicates++;
      received.add(seq);
    }
  }
  receive(segments[0]);
  if (at >= phases.indexOf('arrival')) receive(segments[2]);
  if (at >= phases.indexOf('repair')) receive(segments[1]);
  if (at >= phases.indexOf('duplicate')) receive(segments[1]);
  let next = 1;
  while (received.has(next)) next++;
  return {next, duplicates, canReadThrough: next - 1};
}
