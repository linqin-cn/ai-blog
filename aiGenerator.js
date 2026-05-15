const OpenAI = require('openai');
require('dotenv').config();

class AIGenerator {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.AI_API_KEY || 'tp-c126ermj6ty91ombvxll6mvainnyxv1yeu7lkrxdmgsciq94',
      baseURL: process.env.AI_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1'
    });
  }

  async generateContent(prompt) {
    console.log(`正在为主题 "${prompt}" 生成 AI 内容...`);
    try {
      const response = await this.client.chat.completions.create({
        model: process.env.AI_MODEL || "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你是一个专业的技术博客作家。请根据用户提供的主题，生成一篇高质量、结构清晰的 Markdown 格式博客文章。返回结果必须是 JSON 格式，包含 'title' 和 'content' 两个字段。"
          },
          {
            role: "user",
            content: `请写一篇关于 "${prompt}" 的博客。`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        title: result.title,
        content: result.content
      };
    } catch (error) {
      console.error("AI 生成内容失败:", error.message);
      throw error;
    }
  }
}

module.exports = AIGenerator;
