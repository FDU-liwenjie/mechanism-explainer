"""Render H.264 and a PCM mix together, then mux once to retain action-sound timing."""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    renders = ROOT / "renders"
    renders.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=renders) as folder:
        work = Path(folder)
        video, mix, movie = work / "picture.mp4", work / "mix.wav", work / "film.mp4"
        subprocess.run(["remotion", "render", "src/index.tsx", "Film", str(video), *sys.argv[1:],
                        "--audio-codec=pcm-16", f"--separate-audio-to={mix}"], cwd=ROOT, check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-i", str(mix),
                        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(movie)], check=True)
        os.replace(movie, renders / "film.mp4")


if __name__ == "__main__":
    main()
