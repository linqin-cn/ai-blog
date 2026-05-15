const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class CSDNPublisher {
  constructor(options = {}) {
    this.stateFile = options.stateFile || path.join(__dirname, 'state.json');
    this.headless = options.headless !== undefined ? options.headless : false;
    this.viewport = options.viewport || { width: 1500, height: 880 };
  }

  async publish({ title, content, tags = ['学习'] }) {
    let browser;
    let context;
    
    let hasState = fs.existsSync(this.stateFile);
    if (hasState) {
      try {
        const rawState = fs.readFileSync(this.stateFile, 'utf8');
        if (!rawState || !rawState.trim()) {
          throw new Error('empty state');
        }
        JSON.parse(rawState);
        console.log('检测到保存的登录状态，正在尝试加载...');
      } catch (error) {
        console.log('检测到登录状态文件损坏或为空，将重新登录');
        hasState = false;
      }
    } else {
      console.log('未检测到保存的状态，需要首次登录');
    }

    browser = await chromium.launch({ 
      headless: this.headless,
      channel: 'chrome'
    });

    try {
      if (hasState) {
        context = await browser.newContext({ 
          storageState: this.stateFile,
          viewport: this.viewport
        });
      } else {
        context = await browser.newContext({
          viewport: this.viewport
        });
      }

      const page = await context.newPage();
      
      console.log('正在访问 CSDN...');
      await page.goto('https://i.csdn.net/#/user-center/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      let isLoggedIn = await this.checkLoginStatus(page);
      
      if (!isLoggedIn) {
        console.log('\n⚠️  当前未登录或状态已失效。');
        console.log('请在打开的浏览器中完成登录操作（支持扫码、账号密码等）。');
        const loginSuccess = await this.waitForLogin(page, 600000); 
        
        if (!loginSuccess) {
          throw new Error('登录超时，脚本终止。');
        }

        await context.storageState({ path: this.stateFile });
        console.log('✅ 登录成功，状态已保存');
      } else {
        console.log('✅ 已通过保存的状态成功进入系统');
      }

      console.log('\n正在进入博客编辑器...');
      await page.goto('https://editor.csdn.net/md/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);

      await this.handleTutorial(page);

      const success = await this.fillAndPublish(page, title, content, tags);

      if (success) {
        console.log('\n🎉 任务全部完成！博客已成功发布。');
        return { success: true };
      } else {
        console.log('\n❌ 任务未完成：虽然执行了点击，但未检测到发布成功状态。');
        return { success: false, message: '未检测到发布成功状态' };
      }
      
    } catch (error) {
      console.error('❌ 运行出错:', error.message);
      return { success: false, error: error.message };
    } finally {
      console.log('\n浏览器将在 10 秒后关闭...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      await browser.close();
    }
  }

  async checkLoginStatus(page) {
    const url = page.url();
    if (url.includes('passport.csdn.net')) return false;
    
    try {
      const selectors = ['.user-avatar', '.toolbar-btn-login-after', '#toolbar-user-card', '.has--login', 'img[src*="avatar"]'];
      for (const selector of selectors) {
        const el = await page.$(selector);
        if (el) return true;
      }
      const hasWriteText = await page.evaluate(() => {
        return document.body.innerText.includes('写博客') || 
               document.body.innerText.includes('内容管理') ||
               document.body.innerText.includes('个人中心');
      });
      return hasWriteText && !url.includes('passport');
    } catch (e) {
      return false;
    }
  }

  async waitForLogin(page, timeout) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.checkLoginStatus(page)) return true;
      console.log(`[${Math.floor((Date.now() - start) / 1000)}s] 仍未检测到登录状态...`);
      await page.waitForTimeout(5000);
    }
    return false;
  }

  async handleTutorial(page) {
    console.log('检查是否存在教学提示...');
    const tutorialButtons = ['text=我知道了', 'button:has-text("我知道了")', '.guide-close', '.opt-button:has-text("我知道了")', 'text=跳过', 'text=下一步'];
    const modalCloseSelectors = ['button.modal__close-button.button[aria-label="关闭"]', 'button.modal__close-button[aria-label="关闭"]', 'button[title="关闭"][aria-label="关闭"]', '.el-dialog__headerbtn', '.modal-close', '.close'];
    for (let i = 0; i < 3; i++) {
      let found = false;
      for (const selector of tutorialButtons) {
        try {
          const btn = await page.$(selector);
          if (btn && await btn.isVisible()) {
            console.log(`发现引导按钮: ${selector}，正在关闭...`);
            await btn.click();
            await page.waitForTimeout(1000);
            found = true;
            break;
          }
        } catch (e) {}
      }
      if (!found) {
        try {
          const closed = await page.evaluate(() => {
            const title = Array.from(document.querySelectorAll('.el-dialog__title, .modal-title, h3, h4')).find(el => {
              return (el.innerText || '').includes('模板库');
            });
            if (!title) return false;
            const modal = title.closest('.el-dialog, [role="dialog"], .modal, .popup');
            if (!modal) return false;
            const closePath = 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z';
            const closeButton = modal.querySelector('button.modal__close-button.button[aria-label="关闭"], button.modal__close-button[aria-label="关闭"], button[title="关闭"][aria-label="关闭"], .el-dialog__headerbtn, .modal-close, .close');
            const closeSvg = Array.from(modal.querySelectorAll('svg.icon')).find(el => {
              const path = el.querySelector('path');
              return path && path.getAttribute('d') === closePath;
            });
            const target = closeButton || (closeSvg ? (closeSvg.closest('button') || closeSvg.closest('span') || closeSvg) : null);
            if (!target) return false;
            target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return true;
          });
          if (closed) {
            console.log('检测到模板库弹窗，已关闭');
            found = true;
          }
        } catch (e) {}
      }
      if (!found) {
        for (const selector of modalCloseSelectors) {
          try {
            const btn = await page.$(selector);
            if (btn && await btn.isVisible()) {
              const isTemplateModal = await btn.evaluate((node) => {
                const modal = node.closest('.el-dialog, [role="dialog"], .modal, .popup');
                if (!modal) return false;
                const title = modal.querySelector('.el-dialog__title, .modal-title, h3, h4');
                return title && (title.innerText || '').includes('模板库');
              });
              if (!isTemplateModal) continue;
              await btn.click({ force: true });
              await page.waitForTimeout(1000);
              found = true;
              break;
            }
          } catch (e) {}
        }
      }
      if (!found) break;
    }
  }

  async fillAndPublish(page, title, content, tags) {
    console.log('填写标题...');
    const titleSelector = 'input.article-bar__title--input, input[placeholder*="文章标题"], .title-input';
    await page.waitForSelector(titleSelector, { state: 'attached', timeout: 30000 });
    
    try {
      const titleEl = await page.$(titleSelector);
      await titleEl.click({ force: true });
      await titleEl.fill(title);
    } catch (e) {
      await page.evaluate(({ selector, val }) => {
        const el = document.querySelector(selector);
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, { selector: titleSelector, val: title });
    }
    console.log(`已填写标题: ${title}`);

    console.log('填写内容...');
    await page.waitForTimeout(2000);
    try {
      await page.mouse.click(300, 400); 
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      
      // 使用 evaluate 直接设置值比 keyboard.type 更稳定，特别是长文章
      await page.evaluate((c) => {
        const editor = document.querySelector('.editor-content, .markdown-editor, #editor');
        if (editor) {
          // 针对不同的编辑器可能有不同的赋值方式
          // CSDN 的编辑器通常是基于 CodeMirror 或类似的
        }
      }, content);

      // 兜底：使用 keyboard.type 但分块输入
      const chunks = content.match(/.{1,1000}/gs) || [content];
      for (const chunk of chunks) {
        await page.keyboard.type(chunk);
      }
      
      console.log('内容填写完成');
    } catch (e) {
      console.log('填写内容失败:', e.message);
    }

    console.log('正在触发第一步发布按钮...');
    await page.waitForTimeout(2000);
    const triggered = await page.evaluate(() => {
      const selectors = ['.btn-publish', '.article-bar__publish button'];
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el && el.innerText.includes('发布')) {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (!triggered) {
      await page.click('button:has-text("发布文章")', { force: true });
    }

    console.log('等待发布弹窗出现...');
    await page.waitForTimeout(4000); 
    
    // 处理标签
    console.log('处理标签...');
    try {
      const hasTags = await page.evaluate(() => {
        return document.querySelectorAll('.tag-list .tag-item, .tag-container .tag').length > 0;
      });

      if (!hasTags) {
        try {
          const addTagBtn = await page.waitForSelector('.add-tag, .tag-container button', { timeout: 5000 });
          await addTagBtn.click();
        } catch (e) {
          await page.getByText('添加文章标签').first().click();
        }
        
        await page.waitForTimeout(1000);
        const tagInput = await page.waitForSelector('.el-input__inner, input[placeholder*="搜索"]');
        for (const tag of tags) {
          await tagInput.click({ force: true });
          await tagInput.fill(tag);
          const picked = await page.evaluate(() => {
            const list = document.querySelector('ul.el-autocomplete-suggestion__list');
            if (!list) return false;
            const first = list.querySelector('li');
            if (!first || first.offsetHeight === 0) return false;
            first.click();
            return true;
          });
          if (!picked) {
            await page.waitForTimeout(500);
            continue;
          }
          await page.waitForFunction((text) => {
            const candidates = Array.from(document.querySelectorAll('.tag-list .tag-item, .tag-container .tag'));
            return candidates.some(el => (el.innerText || '').includes(text));
          }, tag, { timeout: 5000 });
        }
      }

    } catch (e) {
      console.log('处理标签失败:', e.message);
    }

    await page.waitForTimeout(2000);
    console.log('正在执行最后一步：点击“发布文章”按钮...');
    
    let finalResult = false;
    try {
      const publishBtn = page.locator('button.btn-b-red.ml16:has-text("发布文章"), button.button.btn-b-red:has-text("发布文章")').first();
      await publishBtn.waitFor({ state: 'visible', timeout: 10000 });
      await publishBtn.scrollIntoViewIfNeeded();
      await publishBtn.click({ timeout: 5000 });
      finalResult = true;
    } catch (e) {}

    if (!finalResult) {
      try {
        finalResult = await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button.btn-b-red.ml16, button.button.btn-b-red'))
            .find(b => (b.innerText || '').includes('发布文章') && !b.disabled && b.offsetHeight > 0);
          if (!btn) return false;
          btn.scrollIntoView({ block: 'center' });
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return true;
        });
      } catch (e) {}
    }

    try {
      await page.waitForURL(url => /article\/details\/\d+/.test(url.href), { timeout: 30000 });
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = CSDNPublisher;
