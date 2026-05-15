const CSDNPublisher = require('./publisher');
const AIGenerator = require('./aiGenerator');
require('dotenv').config();

/**
 * 解析命令行参数
 * 支持格式: 
 * 1. node autoPublishCSDN.js "主题" (使用 AI 生成内容)
 * 2. node autoPublishCSDN.js --title "标题" --content "内容" (直接发布)
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    topic: null,
    title: null,
    content: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      result.title = args[i + 1];
      i++;
    } else if (args[i] === '--content' && args[i + 1]) {
      result.content = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      result.topic = args[i];
    }
  }

  return result;
}

async function main() {
  const { topic, title: inputTitle, content: inputContent } = parseArgs();
  
  console.log(`--- CSDN 自动发布任务开始 ---`);

  try {
      let finalTitle = inputTitle;
      let finalContent = inputContent;
      let finalTags = ['AI', '自动化', '技术分享'];

    // 1. 确定内容来源
    if (finalTitle && finalContent) {
      console.log(`ℹ️ 检测到直接传入的标题和内容，跳过 AI 生成阶段。`);
    } else {
      const targetTopic = topic || "自动化技术分享";
      console.log(`ℹ️ 正在根据主题 "${targetTopic}" 使用 AI 生成内容...`);
      const ai = new AIGenerator();
        const aiResult = await ai.generateContent(targetTopic);
        finalTitle = aiResult.title;
        finalContent = aiResult.content;
        if (Array.isArray(aiResult.tags) && aiResult.tags.length > 0) {
          finalTags = aiResult.tags;
        }
        console.log(`✅ AI 内容生成成功`);
      }

    console.log(`标题: ${finalTitle}`);
    console.log(`内容预览: ${finalContent.substring(0, 50)}...`);

    // 2. 执行发布
    const publisher = new CSDNPublisher({
      headless: process.env.CSDN_HEADLESS === 'true'
    });

      const result = await publisher.publish({
        title: finalTitle,
        content: finalContent,
        tags: finalTags
      });

    if (result.success) {
      console.log(`\n🎉 博客发布成功！`);
    } else {
      console.log(`\n❌ 发布失败: ${result.error || result.message}`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n💥 程序运行过程中出现致命错误:`, error.message);
    process.exit(1);
  }
}

main();
