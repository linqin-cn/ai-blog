---
name: csdn-auto-publish
description: Use when user wants OpenClaw to analyze materials and publish to CSDN using node autoPublishCSDN.js. Trigger on “OpenClaw”, “CSDN”, “发布博客”, “自动发布”.
---

# CSDN Auto Publish

Use this skill to turn user materials into a Markdown blog and publish it via the local script.

## Workflow

1. Analyze the user materials and produce:
   - title: one-line blog title
   - content: Markdown blog body
2. Execute the publish command:

```bash
node autoPublishCSDN.js --title "<title>" --content "<content>"
```

## Rules

- The content must be valid Markdown.
- Keep the title concise.
- If the title or content contains double quotes, escape them before running the command.

## Output format

Return a short confirmation after the command runs.
