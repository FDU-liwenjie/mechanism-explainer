"""Check renders against the approved narration. Optionally make a gallery for review."""
import argparse
import json
import math
import re
import subprocess
from pathlib import Path
from narrate import ROOT, SCRIPT, clock, duration, landing_frames

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", nargs="?")
    parser.add_argument("--stills", type=Path, help="write one review image per beat and a contact sheet")
    args = parser.parse_args()
    if args.stills and not args.video:
        parser.error("--stills needs a rendered film")
    timeline = json.loads((SCRIPT/"timeline.json").read_text())
    draft = json.loads((SCRIPT/"narration.json").read_text())
    beats = timeline["beats"]
    fps = timeline["fps"]
    def require(condition, message):
        if not condition:
            raise SystemExit(message)
    require(draft["fps"] == fps and len(draft["beats"]) == len(beats) > 0, "草稿或帧率已改，请重建配音时间轴")
    require(draft.get("voice") == timeline["draftVoice"], "所选音色已改，请重建旁白时间轴")
    cursor = 0
    expected_subs = []
    for i, (beat, planned) in enumerate(zip(beats, draft["beats"]), 1):
        require(all(beat.get(k)==v for k,v in planned.items()), f"第 {i} 拍已改，请重建时间轴")
        require(beat["from"] == cursor and 0 < beat["speech"] <= beat["to"]-cursor, f"第 {i} 拍时间轴断开")
        length = beat["to"] - cursor
        require(length - beat["speech"] == round(planned.get("hold", .12) * fps), f"第 {i} 拍的观察停顿不符")
        timing = landing_frames(planned.get("landing"), beat["speech"], length, fps)
        require(beat.get("landing") == planned.get("landing") and
                all(beat.get(k) == timing.get(k) for k in ("motionFrom", "landAt")), f"第 {i} 拍声画落点未更新")
        require(abs(duration(ROOT/"public"/beat["audio"])*fps - beat["speech"]) <= 1.001, f"第 {i} 拍音频长度不符")
        require(beat["text"].strip() and beat["action"].strip(), f"第 {i} 拍缺文稿或动作")
        expected_subs.append(f"{i}\n{clock(cursor,fps)} --> {clock(cursor+beat['speech'],fps)}\n{beat['text']}\n")
        cursor = beat["to"]
    require(cursor == timeline["total"], "结束帧不符")
    require((SCRIPT/"narration.srt").read_text().strip() == "\n".join(expected_subs).strip(), "字幕与时间轴不符")
    source = "随包样片原录音" if timeline.get("source") == "bundled-example" else "配音"
    print(f"通过 · {len(beats)} 拍 · {cursor} 帧 · {cursor/fps:.2f} 秒 · {source} · {timeline['voice']}")
    if not args.video:
        return
    video = Path(args.video).resolve()
    def ff(args):
        subprocess.run(["ffmpeg","-hide_banner","-v","error","-y",*args],check=True)
    streams = json.loads(subprocess.check_output(["ffprobe","-v","error","-show_streams","-of","json",str(video)]))["streams"]
    v = next((s for s in streams if s["codec_type"]=="video"),None)
    require(v is not None and any(s["codec_type"]=="audio" for s in streams), "成片缺少画面或音轨")
    n,d = map(int,v["avg_frame_rate"].split("/"))
    require(n==fps*d and int(v.get("nb_frames",0))==cursor, "成片帧率或帧数与旁白不符")
    ff(["-i",str(video),"-f","null","-"])
    if args.stills:
        args.stills.mkdir(parents=True,exist_ok=True)
        for i,b in enumerate(beats):
            sec = (b["from"] + b.get("landAt", math.floor(b["speech"]*.72))) / fps
            ff(["-ss",str(sec),"-i",str(video),"-frames:v","1","-vf","scale=480:-2",str(args.stills/f"beat-{i:04d}.jpg")])
        ff(["-i",str(args.stills/"beat-%04d.jpg"),"-vf",f"tile=3x{math.ceil(len(beats)/3)}:nb_frames={len(beats)}:padding=3",
            "-frames:v","1",str(args.stills/"overview.jpg")])
    scan=subprocess.run(["ffmpeg","-nostats","-i",str(video),"-vf","freezedetect=n=-52dB:d=3",
                         "-af","silencedetect=n=-46dB:d=2.8","-f","null","-"],capture_output=True,text=True,check=True)
    for line in scan.stderr.splitlines():
        if re.search(r"freeze_(start|end):|silence_(start|end):",line): print(line.split("] ")[-1])
    print("音视频可解码。冻结/静音为复核提示，按对应节拍判断。")

if __name__=="__main__":
    main()
