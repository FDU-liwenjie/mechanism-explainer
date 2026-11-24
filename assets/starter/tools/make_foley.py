"""Rebuild the starter's slide, latch and release sounds from deterministic synthesis."""
import math
import random
import struct
import wave
from pathlib import Path

DEST = Path(__file__).resolve().parents[1] / "public" / "foley"
RATE = 48000


def write_sound(name, duration, signal, peak):
    samples = [signal(i / RATE) for i in range(round(RATE * duration))]
    scale = 32767 * peak / max(map(abs, samples))
    with wave.open(str(DEST / name), "wb") as out:
        out.setparams((1, 2, RATE, 0, "NONE", ""))
        out.writeframes(b"".join(struct.pack("<h", round(scale * x)) for x in samples))


def main():
    DEST.mkdir(exist_ok=True)
    noise = random.Random(44)
    filtered = 0.0

    def slide(t):
        nonlocal filtered
        filtered = .93 * filtered + .07 * noise.uniform(-1, 1)
        rise = .025 * math.sin(math.tau * (140*t + 380*t*t))
        return math.sin(math.pi * (t/.42))**1.5 * (filtered + rise)

    def knock(t, hz, decay):
        if t < 0:
            return 0
        tone = math.sin(math.tau*hz*t) + .6*math.sin(math.tau*1.59*hz*t)
        return min(1, t/.0015) * math.exp(-t/decay) * (tone + .22*noise.uniform(-1, 1))

    def ping(t, hz):
        if t < 0:
            return 0
        return min(1, t/.004) * math.exp(-t/.052) * math.sin(math.tau*hz*t)

    write_sound("slide.wav", .42, slide, .21)
    write_sound("latch.wav", .22, lambda t: knock(t, 370, .026) + .62*knock(t-.029, 720, .020), .48)
    write_sound("release.wav", .32, lambda t: ping(t, 520) + .55*ping(t-.05, 700), .33)


if __name__ == "__main__":
    main()
