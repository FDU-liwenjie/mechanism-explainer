# 原理放映室 · Mechanism Explainer

在 Codex 里说一句「用三分钟，给第一次接触 AI 的同学讲清 Wiki、RAG 和 Agent 怎么配合」。原理放映室先查资料，交一版可以直接朗读的解说词，再用同一段内容让你选讲法、听声音、看镜头。最后交付视频、字幕、分镜和可逐镜修改的 Remotion 工程。

## 安装和第一次使用

在装有 Git 的电脑上将仓库克隆到个人 Skill 目录。以下命令适用于 macOS 和 Linux。

```sh
mkdir -p ~/.agents/skills
git clone https://github.com/FDU-liwenjie/mechanism-explainer.git ~/.agents/skills/mechanism-explainer
```

重新打开 Codex 对话，输入「用 $mechanism-explainer 给我讲清一个知识点」。也可以下载本仓库的 ZIP，将包含 `SKILL.md` 的文件夹命名为 `mechanism-explainer`，放入个人 Skill 目录。

| 阶段 | 可以做的选择 |
| --- | --- |
| 看解说词 | 用生活追问、课堂推演或技术拆解来讲，也可以直接改一句。 |
| 听旁白 | 本地试听 15 个角色，按名字或编号选声。默认是「高中数学女老师」。 |
| 看画面 | 参考水彩笔刷、孔版印刷、Wi-Fi 科普原理实验或像素街景，先看 15–30 秒样片。 |
| 出成片 | 旁白、字幕、运镜和音效共用帧时间轴，关键动作后留读图时间。底部章节条默认关闭。 |

下载后打开 [离线试听页](assets/starter/voices/index.html) 即可播放；GitHub 文件页显示该页面的源代码。[SVG 动作样片](assets/svg-motions-preview.mp4) 演示沿线传递、分层拆解和同步对照。

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

本项目基于 Vincent Wei 的 Anything2Explainer 制作思路，沿用调研、写稿、代码动画、多 Agent 分工与成片复核的流程。原理放映室把讲法、音色和画风做成独立的选择环节，加入 Fish 预设角色、四条成片的镜头参考，以及按实际音长安排运镜和音效的制作方式。[Anything2Explainer 原项目](https://github.com/Vincentwei1021/anything2explainer)

仓库随附上游的 PolyForm Noncommercial 1.0.0 许可与版权声明。15 段角色试听的创作者和原页面逐项列在音色清单中，音色和第三方素材各自的使用条件仍然适用。[上游许可](LICENSE) · [音色来源清单](assets/starter/script/voices.json)
