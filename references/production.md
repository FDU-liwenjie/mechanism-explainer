# 从打样到交付

## 建立与播放

将整个 `assets/starter` 复制到新项目目录。以下命令在副本内执行。依赖 Node.js、npm、Python 3.10+、FFmpeg 和 ffprobe。随包 TCP 样片可用已录制的云希旁白离线复播。为新片配音时先按下文生成音轨。系统须具备中文字形，如 Noto Sans CJK SC。

```sh
npm install
npm run check
python3 tools/check.py
npm run studio
npm run render
python3 tools/check.py renders/film.mp4 --stills qc/stills
```

Studio 里的 Film、Studio、Diagram 共用本片时间轴，后两者用同一份声音和数据演示两种画法。SvgMotions 是单独的 18 秒 SVG 动作示例，带三个可在正式分镜中调用的镜头。最终成片取 Film，风格、章节条和点位音效在 `src/design.ts` 选择。样片输出 1920 × 1080；`script/narration.json` 中的 fps 决定渲染和字幕的同一时基。需要 60 帧时从项目开始指定并重建旁白时间轴。

## 文案、声音与时间轴

`script/narration.json` 按语义停顿划分 beats。每拍包括 chapter、scene、text、action；phase 供镜头查模型状态，hold 是句尾留给读图的秒数。先向用户呈现可朗读的段落，再做这种切分。中文一块字幕以一口气能读完为准，英文按短语切分，实看一遍是否遮挡。连续半句可合成一个自然完整的短句。模板内附的预制音频源于一次完整朗读的分切，适合离线打样。

```sh
python3 tools/narrate.py --list
python3 tools/narrate.py --voice 5 --preview
python3 tools/narrate.py --select 高中数学女老师
python3 tools/narrate.py --audition '中间少了一段，后面的数据还能先交给应用吗？'
python3 tools/narrate.py
```

双击 [离线试听页](../assets/starter/voices/index.html) 即可比较所有角色，用「复制选声指令」将选择带回对话。录音来自各角色的 Fish Audio 示例，各自的台词不同。命令行的 `--preview` 返回本地音频路径，`--select` 只将名称写入本片的 narration.json。浏览、试听和选声均无需密钥。

### 首次用自己的稿件配音

1. 在 Fish 开发者页面登录自己的账号，创建并复制 API Key。网页的模型 ID 用于选角色，API Key 用于授权本次合成。[Fish Audio 密钥管理页](https://fish.audio/app/api-keys/)
2. macOS 用户打开随 Skill 安装的[钥匙串配置工具](../scripts/配置%20Fish%20Audio.command)，在本机终端隐藏输入 Key。工具会回读核对，以后新工程可复用。其他平台或 CI 可通过本机环境或密钥管理器注入 `FISH_AUDIO_API_KEY`（兼容 `FISH_API_KEY`）。环境变量优先。请将密钥留在本机或 CI 的 secret 中。
3. 在工程副本里用上面的 `--audition` 试读一句自己的稿件，播放返回的 MP3 检查读音与节奏。这同时验证了账号、模型和所选角色的访问权限。满意后再运行不带参数的配音命令，生成全部旁白。后续换音色只需重新选声。

新片默认「高中数学女老师」；`--voice` 可以只覆盖本次调用。工具将选定角色的 `reference_id` 和本句文本发往 Fish TTS，默认模型为 `s2.1-pro-free`。免费模型的开放时间、额度和限流以 Fish 公告为准。若要使用其他模型，由用户在本机设置 `FISH_TTS_MODEL`。遇到认证、额度或权限问题时回报原因，保留已有音频，等待用户决定下一步。[Fish API 入门](https://docs.fish.audio/developer-guide/getting-started/quickstart) · [模型开放情况](https://docs.fish.audio/developer-guide/getting-started/changelog)

运行后生成逐拍音轨、`script/timeline.json`、`script/narration.srt`、`script/storyboard.md`。同一引擎、模型、音色和文本复用缓存。修改一句后重建时间轴；动作与音效使用该拍的局部进度，后续镜头随新边界移动。语速和发音影响意义时，先修改可朗读的说法，再审试听。

## 镜头与并行交接

重要动作可在 beat 中加 `landing`。例如上文的补传块使用 `"hold": 1.50` 和 `"landing": {"afterSpeech": 0.54, "travel": 0.52, "travelSound": "foley/slide.wav", "sound": "foley/latch.wav"}`。时间单位为秒。旁白结束约半秒后落位，从接触前 0.52 秒开始移动；句末 1.50 秒包括运动和结果停留。精确落点按本片帧率就近取整。普通节拍可省略 landing，单纯的安静停留只需 hold。

镜头组件的 `motion` 从起动的 0 走到落位的 1，动作音与落位音分别使用这两个边界。镜头内用 motion 驱动物体，按 localFrame 和 fps 控制提前对焦或转场。音效文件放在 public 里，两种声音均可省略。随包滑动、扣合与交付三段拟音可通过 `python3 tools/make_foley.py` 调整并重新生成。只调节奏并沿用已录好的同一版台词时，运行 `python3 tools/narrate.py --retime`，再渲染。导出的分镜会列出收声、起动、落位和停留帧数。

研究员交事实来源、反例和成立条件；主笔交可朗读文案、每句的疑问与可演示动词；主创交同一份时间轴、调色板、主角、单位与已验收样镜。不同构建组各领一段连续章节，约定上一镜末态和下一镜首态，交各自的 `src/scenes/章节名.tsx`、素材及待复核帧号。主创在 `src/index.tsx` 的 scenes 表注册组件。镜头可使用 Remotion Sequence、SVG、CSS、Canvas 或预渲染的 3D 素材，把模型和相机分开。引入 B-roll 时用 OffthreadVideo + staticFile，素材来源与许可逐项登记。

每张镜头单列出起止、句子、状态、主体、改变的量、镜头运动、声音落点、可见结果。需要推导或比较时，写一个能独立运行的模型检查；例如保持比特串与符号时长不变，只改正弦曲线的振幅或频率，两者不能同时变化。三维实验台也要检查因果方向、遮挡和投影角度。纯字幕换词不能算作对象动作。

## 预览、修复与验收

```sh
npx remotion still src/index.tsx Film qc/key.png --frame=100
npx remotion render src/index.tsx Film renders/segment.mp4 --frames=30-149
python3 tools/check.py renders/film.mp4 --stills qc/stills
```

预览帧号从零计，Remotion 的 --frames 两端包含。时间轴用左闭右开区间。打样要包含一次实际解释动作与结果停留；片头、章间承接和结尾回扣各抽一处。短片直接预览到结尾。

独立复核者按章节检查「先听懂、静音也看得懂」两遍。第一遍对片长、语速、术语发音和动作音效；第二遍对控制变量、字幕安全区、连续性和状态。检查事实清单、数字单位、组界前后帧、亮底字幕可读性和重复交付。工具会报告相对长的冻结或静音，由人判定它是有意留白或坏切点。片长明显偏离时从稿件信息量调整。修复单写时间、预期观察、错误画面和受影响的组，复验时带上前后一个节拍。交付时标明实测时长、帧率、配音、事实来源、遗留项与可编辑入口。
