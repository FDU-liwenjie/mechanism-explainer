"""Build frame-aligned narration from approved preset voices. Run in any directory."""
import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
import tempfile
import time
from functools import lru_cache
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "script"
AUDIO = ROOT / "public" / "audio"
DEFAULT_VOICE = "高中数学女老师"
KEY_PAGE = "https://fish.audio/app/api-keys/"
DEFAULT_MODEL = "s2.1-pro-free"


def write_atomic(path, content):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as f:
        name = f.name
        try:
            f.write(content)
            f.close()
            os.replace(name, path)
        finally:
            Path(name).unlink(missing_ok=True)


def duration(path):
    result = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                      "-of", "default=nw=1:nk=1", str(path)], text=True)
    length = float(result)
    if not 0 < length < float("inf"):
        raise ValueError(f"Invalid audio duration: {path.name}")
    return length


def preset_key(text, voice):
    model = os.getenv("FISH_TTS_MODEL") or DEFAULT_MODEL
    value = json.dumps([model, voice["provider"], voice["reference_id"], text], ensure_ascii=False)
    return hashlib.sha256(value.encode()).hexdigest()[:24]


@lru_cache(maxsize=1)
def fish_api_key():
    key = (os.getenv("FISH_AUDIO_API_KEY") or "").strip() or (os.getenv("FISH_API_KEY") or "").strip()
    if key:
        return key
    if sys.platform == "darwin":
        item = subprocess.run(
            ["/usr/bin/security", "find-generic-password", "-s", "fish.audio:mechanism-explainer",
             "-a", "Fish Audio API", "-w"],
            capture_output=True, text=True,
        )
        if item.returncode == 0 and item.stdout.strip():
            return item.stdout.strip()
        if item.returncode not in (0, 44):
            raise SystemExit("无法读取 Fish Audio 钥匙串项目，请解锁登录钥匙串并允许访问。")
        raise SystemExit(f"生成新旁白需要你自己的 Fish Audio API Key。请从 {KEY_PAGE} 获取，然后运行 Skill 的「配置 Fish Audio.command」，或设置 FISH_AUDIO_API_KEY。")
    raise SystemExit(f"生成新旁白需要你自己的 Fish Audio API Key。请从 {KEY_PAGE} 获取，在本机设置 FISH_AUDIO_API_KEY 后重试。")


def synthesize(text, voice, dest):
    key = fish_api_key()
    body = json.dumps({"text": text, "reference_id": voice["reference_id"], "format": "mp3"})
    request = Request("https://api.fish.audio/v1/tts", data=body.encode(),
                      headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                               "model": os.getenv("FISH_TTS_MODEL") or DEFAULT_MODEL})
    errors = {
        401: "密钥无效或已过期，请更新本机钥匙串或环境变量。",
        402: "当前账户或模型额度不足，请查看开发者后台的 API 额度。",
        403: "当前账户没有访问权限，请检查模型与所选音色的授权。",
        404: "请检查所选模型是否仍开放，以及音色 ID 是否可访问。",
        429: "请求受限，请按服务商提示稍后重试。",
    }
    for attempt in range(3):
        try:
            with urlopen(request, timeout=120) as response:
                dest.write_bytes(response.read())
            return
        except HTTPError as error:
            delay = (error.headers or {}).get("Retry-After", "")
            wait = int(delay) if delay.isdecimal() else 3 * (attempt + 1)
            if error.code == 429 and attempt < 2 and (not delay or delay.isdecimal()) and wait <= 60:
                time.sleep(wait)
                continue
            hint = errors.get(error.code, "请检查服务状态，稍后重新运行。")
            raise SystemExit(f"Fish Audio HTTP {error.code}。{hint}已生成的语音会保留。") from None
        except (URLError, TimeoutError):
            raise SystemExit("连接 Fish Audio 超时或中断，请检查网络后重试。已生成的语音会保留。") from None


def clip(text, voice):
    AUDIO.mkdir(parents=True, exist_ok=True)
    path = AUDIO / (preset_key(text, voice) + ".mp3")
    if not path.exists():
        with tempfile.TemporaryDirectory(dir=AUDIO) as tmp:
            temp = Path(tmp) / "clip.mp3"
            synthesize(text, voice, temp)
            duration(temp)
            os.replace(temp, path)
    return path, duration(path)


def clock(frame, fps):
    ms = round(frame * 1000 / fps)
    return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"


def landing_frames(landing, speech, length, fps):
    """Local, zero-based frames for a move that ends relative to the spoken cue."""
    if landing is None:
        return {}
    start_offset = float(landing["afterSpeech"])
    travel = float(landing["travel"])
    if not math.isfinite(start_offset) or not math.isfinite(travel) or travel <= 0:
        raise ValueError("动作的偏移须为有限值，运动时长须大于零")
    contact = speech + round(start_offset * fps)
    begin = contact - max(1, round(travel * fps))
    if not 0 <= begin < contact < length:
        raise ValueError("动作超出本拍，请调整 travel、afterSpeech 或句末 hold")
    for key in ("sound", "travelSound"):
        if key in landing:
            sound = (ROOT / "public" / landing[key]).resolve()
            if not sound.is_relative_to((ROOT / "public").resolve()) or not sound.is_file():
                raise ValueError(f"音效需要位于 public 内: {landing[key]}")
    return {"motionFrom": begin, "landAt": contact}


def build(doc, voice_name, get_clip, source=None):
    fps = doc["fps"]
    if fps not in (24, 25, 30, 50, 60):
        raise ValueError("fps must be 24, 25, 30, 50 or 60")
    start = 0
    cues, subs, board = [], [], ["| 帧 [起,止) | 章 | 镜头 | 旁白 | 动作 | 声画落点（帧） |", "|---|---|---|---|---|---|"]
    if not doc["beats"]:
        raise ValueError("解说稿至少需要一个节拍")
    for i, item in enumerate(doc["beats"], 1):
        if not all(isinstance(item.get(k), str) and item[k].strip() for k in ("chapter","scene","text","action")):
            raise ValueError(f"第 {i} 拍缺少章节、镜头、解说或动作")
        gap = float(item.get("hold", .12))
        if gap < 0 or not math.isfinite(gap):
            raise ValueError(f"第 {i} 拍 hold 无效")
        path, sec = get_clip(i, item["text"])
        speech = math.ceil(sec * fps)
        stop = start + speech + round(fps * gap)
        timing = landing_frames(item.get("landing"), speech, stop - start, fps)
        cues.append({**item, **timing, "from":start, "to":stop, "speech":speech, "audio":"audio/"+path.name})
        subs.append(f"{i}\n{clock(start,fps)} --> {clock(start+speech,fps)}\n{item['text']}\n")
        note = ""
        if timing:
            end = start + timing["landAt"]
            note = f"收声 {start+speech}，起动 {start+timing['motionFrom']}，落位 {end}，读图 {stop-end} 帧"
        board.append(f"| {start}–{stop} | {item['chapter']} | {item['scene']} | {item['text']} | {item['action']} | {note} |")
        start = stop
    timeline = {"fps":fps, "draftVoice":doc.get("voice"), "voice":voice_name, "total":start, "beats":cues}
    if source is not None:
        timeline["source"] = source
    # Timeline is the render entry point. Publish it after all referenced audio exists.
    write_atomic(SCRIPT/"narration.srt", ("\n".join(subs)+"\n").encode())
    write_atomic(SCRIPT/"storyboard.md", ("\n".join(board)+"\n").encode())
    write_atomic(SCRIPT/"timeline.json", (json.dumps(timeline,ensure_ascii=False,indent=2)+"\n").encode())


def main():
    p = argparse.ArgumentParser(description=__doc__)
    mode = p.add_mutually_exclusive_group()
    mode.add_argument("--list", action="store_true", help="离线列出所有预设")
    mode.add_argument("--preview", action="store_true", help="显示本地样音路径；搭配 --voice 试听指定角色")
    mode.add_argument("--select", metavar="VOICE", help="为当前项目保存音色名称或编号，不生成音频")
    mode.add_argument("--audition", metavar="TEXT", help="用自己的台词生成试读，不改成片时间轴")
    mode.add_argument("--retime", action="store_true", help="复用上次录音，只重排声画时间")
    p.add_argument("--voice", help="本次使用的音色名称或编号")
    a = p.parse_args()
    voices = {v["name"]: v for v in json.loads((SCRIPT/"voices.json").read_text())}
    if a.list:
        for i, v in enumerate(voices.values(), 1):
            print(f"{i:2}. {v['name']}")
        return
    if a.select is not None and a.voice is not None:
        p.error("--select 后直接填写要保存的音色")
    doc = json.loads((SCRIPT/"narration.json").read_text())
    if a.retime:
        previous = json.loads((SCRIPT/"timeline.json").read_text())
        if a.voice or a.audition or previous["draftVoice"] != doc.get("voice"):
            p.error("--retime 只适用于保留原音色和文稿的剪辑")
        if [b["text"] for b in previous["beats"]] != [b["text"] for b in doc["beats"]]:
            p.error("文稿已改，请重新生成旁白")
        def recorded_clip(i, text):
            path = (ROOT/"public"/previous["beats"][i-1]["audio"]).resolve()
            if path.parent != AUDIO.resolve():
                raise ValueError("录音不在 public/audio 中")
            return path, duration(path)
        build(doc, previous["voice"], recorded_clip, previous.get("source"))
        return
    name = a.select if a.select is not None else (a.voice or doc.get("voice", DEFAULT_VOICE))
    if name.isascii() and name.isdecimal() and 1 <= int(name) <= len(voices):
        name = list(voices)[int(name) - 1]
    if name not in voices:
        p.error("未知音色，请用 --list 查看")
    if a.preview:
        preview = ROOT / voices[name]["preview"]
        if not preview.is_file():
            p.error(f"缺少随包试听文件：{preview.name}。请重新安装完整的 Skill。")
        print(preview)
    elif a.select is not None:
        doc["voice"] = name
        write_atomic(SCRIPT/"narration.json", (json.dumps(doc, ensure_ascii=False, indent=2)+"\n").encode())
        print(f"本项目已选用「{name}」。")
    elif a.audition is not None:
        if not a.audition.strip():
            p.error("请填写要试读的台词，或用 --preview 听随包样音")
        print(clip(a.audition, voices[name])[0])
    else:
        build(doc, name, lambda i, text: clip(text, voices[name]))


if __name__ == "__main__":
    main()
