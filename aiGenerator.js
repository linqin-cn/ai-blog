const OpenAI = require('openai');
require('dotenv').config();

class AIGenerator {
  constructor() {
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new Error('Missing AI API key. Set AI_API_KEY in .env or environment variables.');
    }
    this.baseURL = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    this.endpoint = process.env.AI_ENDPOINT || '';
    this.useRaw = (process.env.AI_USE_RAW || 'false') === 'true' || this.baseURL.includes('/chat/completions');
    if (!this.useRaw) {
      this.client = new OpenAI({
        apiKey,
        baseURL: this.baseURL
      });
    }
    this.apiKey = apiKey;
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
    this.forceJson = (process.env.AI_FORCE_JSON || 'true') === 'true';
  }

  async generateContent(prompt) {
    console.log(`正在为主题 "${prompt}" 生成 AI 内容...`);
    try {
      const response = await this.requestCompletion(prompt, true);
      const result = this.parseJson(response.choices[0].message.content);
      return {
        title: result.title,
        content: result.content,
        tags: Array.isArray(result.tags) ? result.tags : []
      };
    } catch (error) {
      if (this.forceJson) {
        console.error("AI 生成内容失败:", error.message);
        throw error;
      }

      console.warn("AI JSON 响应失败，尝试兼容模式...");
      try {
        const response = await this.requestCompletion(prompt, false);
        const result = this.parseJson(response.choices[0].message.content);
        return {
          title: result.title,
          content: result.content,
          tags: Array.isArray(result.tags) ? result.tags : []
        };
      } catch (fallbackError) {
        console.error("AI 生成内容失败:", fallbackError.message);
        throw fallbackError;
      }
    }
  }

  async requestCompletion(prompt, withResponseFormat) {
    const payload = {
      model: this.model,
      messages: [
        {
          role: "system",
          content: "你是一个专业的技术博客作家。请根据用户提供的主题，生成一篇高质量、结构清晰的 Markdown 格式博客文章。返回结果必须是 JSON 格式，包含 'title'、'content' 和 'tags' 三个字段，其中 tags 为 2-5 个简短标签数组。"
        },
        {
          role: "user",
          content: `请写一篇关于 "${prompt}" 的博客。`
        }
      ]
    };

    if (withResponseFormat && this.forceJson) {
      payload.response_format = { type: "json_object" };
    }

    if (this.useRaw) {
      return this.requestCompletionRaw(payload);
    }
    return this.client.chat.completions.create(payload);
  }

  async requestCompletionRaw(payload) {
    const endpoint = this.endpoint || `${this.baseURL.replace(/\/+$/, '')}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data && data.error && data.error.message ? data.error.message : `HTTP ${response.status}`;
      throw new Error(message);
    }
    return data;
  }

  parseJson(rawContent) {
    if (!rawContent) {
      throw new Error("AI 返回内容为空");
    }

    try {
      return JSON.parse(rawContent);
    } catch (error) {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw error;
    }
  }
}

module.exports = AIGenerator;
