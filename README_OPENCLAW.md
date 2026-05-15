# OpenClaw 接入指南 - CSDN 自动发博客

本项目已针对 OpenClaw 智能体进行了优化。OpenClaw 可以通过执行 Shell 命令来调用此程序。

## 调用方式

OpenClaw 整理好文章内容后，可以执行以下命令进行发布：

```bash
node autoPublishCSDN.js --title "你的博客标题" --content "你的博客正文内容(Markdown格式)"
```

## 智能体指令示例 (System Prompt)

你可以将以下内容告知 OpenClaw，或者作为它的任务指令：

> "你是一个博客专家。当我给你一些零散的信息时，请帮我整理成一篇结构清晰、内容丰富的 CSDN 技术博客。
> 整理完成后，请使用 `shell` 工具执行以下命令来发布博客：
> `node autoPublishCSDN.js --title '整理后的标题' --content '整理后的 Markdown 内容'`"

## 功能特性

1. **自动登录**：程序会检查 `state.json`，如果失效会自动提示你在浏览器扫码登录并保存状态。
2. **AI 辅助**：如果你只传主题而不传内容（例如 `node autoPublishCSDN.js "主题名"`），程序会调用内置的 AI 模块自动生成内容。
3. **静默运行**：在 `.env` 中设置 `CSDN_HEADLESS=true` 可以让浏览器在后台运行（建议调试成功后再开启）。

## 注意事项

- **引号转义**：如果博客标题或内容中包含双引号，请确保在 shell 命令中正确转义，或者使用单引号包裹参数。
- **环境依赖**：确保 OpenClaw 运行环境已安装 Node.js 并在项目目录下执行了 `npm install`。
