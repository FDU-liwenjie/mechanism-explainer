# 原理放映室 · Mechanism Explainer

在 Codex 里说一句「给第一次接触 AI 的同学讲清 Wiki、RAG 和 Agent 怎么配合」。原理放映室先给你几个片长可选，每档都写清能讲到哪一步。选好范围后，先看解说词，再选讲法、听声音、看镜头。已经指定的选择会直接沿用。最后交付视频、字幕、分镜和可逐镜修改的 Remotion 工程。

## 安装和第一次使用

在装有 Git 的电脑上将仓库克隆到个人 Skill 目录。以下命令适用于 macOS 和 Linux。

```sh
mkdir -p ~/.agents/skills
git clone https://github.com/FDU-liwenjie/mechanism-explainer.git ~/.agents/skills/mechanism-explainer
```

重新打开 Codex 对话，输入「用 $mechanism-explainer 给我讲清一个知识点」。也可以下载本仓库的 ZIP，将包含 `SKILL.md` 的文件夹命名为 `mechanism-explainer`，放入个人 Skill 目录。

| 阶段 | 可以做的选择 |
| --- | --- |
| 定时长 | 按题目选简明版、完整推演或加练习的精读版。每档有本题预计时长，可以自定或交给导演。 |
| 看解说词 | 用生活追问、课堂推演或技术拆解来讲，也可以直接改一句。 |
| 听旁白 | 本地试听 15 个角色，按名字或编号选声。默认是「高中数学女老师」。 |
| 看画面 | 水彩笔刷、孔版印刷、Wi-Fi 科普原理实验、像素街景、老师手写板书五种可选。先用 15–30 秒样片看一个难点怎么讲。 |
| 出成片 | 旁白、字幕、运镜和音效共用帧时间轴，关键动作后留读图时间。底部章节条默认关闭。 |

下载后打开 [离线试听页](assets/starter/voices/index.html) 即可播放；GitHub 文件页显示该页面的源代码。[SVG 动作样片](assets/svg-motions-preview.mp4) 演示沿线传递、分层拆解和同步对照。

「老师手写板书」从黑板左上逐行往下写。老师说到哪个词，再动笔写那个词。比如帧已经到路由器，板上写的终点却还是服务器，这时学生才举手问「要去服务器，怎么先给路由器呀？」老师等一拍，接着把两段路画全。普通讲解留给板书，底部同步显示旁白，粉笔声随落笔、抬笔收放。[看 37 秒学生发问样片](assets/student-question-preview.mp4)

随包工程还有一段可以逐帧修改的 TCP 接收缓存练习。板上第 2 格空着，第 3 格已有数据。学生的云朵短暂问「第3段能先交吗？」，老师随后写下「先缓存」，圈出缺口。[看 22 秒可编辑板书示例](assets/chalkboard-preview.mp4)

在 Remotion Studio 打开 `Chalkboard` 可预览当前工程的板书和字幕。在工程里将 `film.style` 设为 `'chalkboard'` 后，`Film` 也会渲染同一堂课。可逐行调整板书、停顿和擦板时机，字幕另附 SRT 便于剪辑。[制作方法](references/production.md)

板书配图可以跟着讲解逐笔出现。AI 发展史样片先画同一只猫的正面和背影，再用两张棋盘比较深蓝和 AlphaGo。另有 12 个离线常用图形，也支持把自己的照片、截图和插画放进板书。[看 28 秒配图样片](assets/board-illustrations-preview.mp4) · [浏览图形和用法](references/board-illustrations.md)

## 第一次给自己的稿件配音

试听和选声都可以离线完成。要让角色读新稿时，先用自己的 Fish 账号创建 API Key。macOS 可打开随包配置工具，在终端中隐藏输入，Key 保存至本机登录钥匙串。其他平台可通过环境变量 `FISH_AUDIO_API_KEY` 提供。角色的 Model ID 已随包保存，换角色后继续使用同一份 Key。[创建 API Key](https://fish.audio/app/api-keys/) · [macOS 配置工具](scripts/配置%20Fish%20Audio.command)

在复制出的 `assets/starter` 工程中运行以下命令。试读会返回一个 MP3 路径。编辑 `script/narration.json` 后，最后一条命令按整稿生成旁白、字幕和分镜。

```sh
python3 tools/narrate.py --select 高中数学女老师
python3 tools/narrate.py --audition '作品页给了我们作者的名字。接下来，该查哪一页？'
python3 tools/narrate.py
```

默认请求 Fish 的 `s2.1-pro-free` 模型。服务端决定当前可用时间和额度。相同模型、文本和音色会复用已生成的音轨。[Fish API 入门](https://docs.fish.audio/developer-guide/getting-started/quickstart) · [模型开放情况](https://docs.fish.audio/developer-guide/getting-started/changelog)

## 制作与复查

制作工程使用 React、TypeScript、Remotion、Python 3.10+ 及 FFmpeg / ffprobe。安装 Node.js 和这些工具后，在工程副本中运行 `npm install`、`npm run studio` 预览，运行 `npm run render` 导出 MP4。随包的 TCP 片段已有音轨，可以直接复现。分工、事实核对和渲染检查见[制作与验收](references/production.md)，参考作品的镜头用法见[画风与分镜](references/film-styles.md)。

## 项目来源

本项目基于 Vincent Wei 的 Anything2Explainer 制作思路，沿用调研、写稿、代码动画、多 Agent 分工与成片复核的流程。原理放映室增加了按内容选时长、讲法与画风、Fish 预设角色试听、四条成片的镜头参考和老师手写板书，按实际音长安排运镜、音效和读图停顿。[Anything2Explainer 原项目](https://github.com/Vincentwei1021/anything2explainer)

仓库随附上游的 PolyForm Noncommercial 1.0.0 许可与版权声明。15 段角色试听的创作者和原页面逐项列在音色清单中，音色和第三方素材各自的使用条件仍然适用。[上游许可](LICENSE) · [音色来源清单](assets/starter/script/voices.json)
