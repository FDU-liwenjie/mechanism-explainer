"""Synthesize dry chalk contact and a felt eraser, with real lift-off silence."""
from array import array
from math import exp, sin, pi
from pathlib import Path
import random
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
RATE = 48000
TAU = 2 * pi


def contact(samples, rng, at, length, pitch, gain, *, arc=False, felt=False):
    """Excite soft board modes only where pressure and surface contact coincide."""
    start, count = round(at * RATE), round(length * RATE)
    pulse, grain, pressure_speed = 0.0, 0.0, rng.uniform(.75, 1.2)
    phase1, phase2, phase3, velocity = 0., 0., 0., 1.
    roll, bass, grain_hp = 0., 0., 0.
    until_grain = 0
    for i in range(count):
        t = i / RATE
        u = i / count
        edge = min(1., t / (.050 if felt else .013), (length-t) / (.090 if felt else .032))
        edge = max(0., edge)
        edge = edge * edge * (3.-2.*edge)
        force = sin(pi * u) ** .58
        # A few flecks stick, flex, then release. Each transient rings for 1–4 ms.
        if until_grain <= 0:
            until_grain = round(RATE * rng.uniform(.0028, .010 if felt else .0078))
            pulse = rng.uniform(.3, 1.) ** 2 * (1. if rng.random() > .5 else -1.)
            velocity = .72 * velocity + .28 * rng.uniform(.81, 1.21)
        until_grain -= 1
        pulse *= exp(-1./(RATE*(.0032 if felt else .0017)))
        grain = grain*.79 + pulse*.21
        speed = (1.06 - .16*u + .09 * sin(TAU*u*pressure_speed)) * velocity
        freq = pitch * speed
        phase1 += TAU*freq/RATE
        phase2 += TAU*(freq*1.73+38)/RATE
        phase3 += TAU*(freq*.55+26)/RATE
        body = grain * (.58*sin(phase1) + .25*sin(phase2) + .17*sin(phase3))
        # Fine dust remains well below the resonant contact; no broadband noise bed.
        dust = rng.uniform(-1., 1.)
        roll += (.036 if felt else .17) * (dust-roll)
        bass += .028*(roll-bass)
        grain_hp += .20 * (roll - bass - grain_hp)
        dry = body + (.09 if felt else .032) * grain_hp
        if arc:
            # Pressure rises in the middle of the arc and relaxes before release.
            force *= .58 + .42*sin(pi*u+.12)**2
        samples[start+i] += gain * edge * force * dry


def track(name, duration, motions, peak, **surface):
    rng = random.Random({'write': 8104, 'circle': 1906, 'erase': 5431}[name])
    samples = [0.] * round(duration * RATE)
    for motion in motions:
        contact(samples, rng, *motion, **surface)
    amplitude = peak / max(abs(n) for n in samples)
    pcm = array('h', (round(32767 * max(-1., min(1., sample*amplitude))) for sample in samples))
    if sys.byteorder != 'little':
        pcm.byteswap()
    with wave.open(str(ROOT/'public/chalk'/f'{name}.wav'), 'wb') as out:
        out.setparams((1,2,RATE,0,'NONE','not compressed'))
        out.writeframes(pcm.tobytes())


if __name__ == '__main__':
    (ROOT/'public/chalk').mkdir(parents=True, exist_ok=True)
    # Each tuple gives onset, contact duration, contact pitch and pressure. Leave
    # long spaces between clusters, so the same cue also loops with a clean seam.
    track('write',3.2,[
        (.035,.14,740,.74),(.25,.22,585,.96),(.72,.11,820,.73),
        (1.26,.24,620,1.),(1.61,.12,790,.72),(2.38,.26,535,.86),
    ], .31)
    track('circle',1.2,[
        (.03,.42,560,.86),(.51,.42,495,1.),(.97,.075,630,.43),
    ], .22, arc=True)
    track('erase',1.5,[
        (.035,.52,201,1.),(.73,.48,165,.85),
    ], .15, felt=True)
