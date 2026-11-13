# 平台与抓取候选（未应用账号/robots 变更）

2026-10-05 核对官方说明。`robots.txt` 是抓取指令，不是数据授权或完整防访问措施；伪装 User-Agent 的请求也不能证明真正的官方爬虫能访问。

## 搜索与训练

| 平台 | 搜索 / 用户读取 | 可选训练控制与限制 |
| --- | --- | --- |
| OpenAI | OAI-SearchBot 搜索；ChatGPT-User 用户触发读取 | GPTBot 与搜索设置独立；用户读取的 robots 行为可能不同。[官方说明](https://developers.openai.com/api/docs/bots) |
| Anthropic | Claude-SearchBot 搜索；Claude-User 用户读取 | ClaudeBot 对应模型开发抓取；三类职责分别描述。[官方说明](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) |
| Perplexity | PerplexityBot 搜索；Perplexity-User 用户读取 | 不把用户触发读取的控制等同于自动索引规则；如以后部署 WAF，按官方 UA 与 IP 组合核对。[官方说明](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) |
| Google | Googlebot 控制 Search 抓取；snippet/noindex 控制参与 Search 的内容 | Google-Extended 涉及 Gemini 训练及部分 grounding；不是仅训练，也不改变 Search 排名。[官方说明](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) |

当前通用组已允许公开内容、拒绝源文件及维护目录。本批维持它。若作者选择“保留搜索、拒绝 OpenAI/Anthropic 训练”，在当前文件末尾添加如下完整组：

```text
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /
```

不用为搜索 bot 另加只有 `Allow: /` 的专属组；最具体组可能绕开通用组的维护目录限制。若选择限制 Google-Extended，再增加单独组，并接受相关 Gemini grounding 的影响。作者尚未选择，以上片段未写入生效文件。

Google 官方当前可读取指南仍说明常规 SEO、可索引文本和可见内容一致性，不要求 AI 专用文件或特殊 schema；本批保留既有机器导览，不把它当增长证据。[AI features](https://developers.google.com/search/docs/appearance/ai-features)

## HTTPS

普通请求实测 HTTP 首页 200，HTTPS 首页 200，正文相同；Pages API `https_enforced=false`，部署类型 workflow，source master。HTTPS canonical 已正确。建议作者选择启用 HTTPS 强制跳转；设置后需验证 HTTP 实际跳转及全部资源。尚未执行 PATCH。[GitHub 文档](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

## 后台与衡量

Search Console 复用 `https://simoncos.github.io/` URL-prefix 属性，核实所有权与实际报表，无须 github.io 父域 DNS。[属性说明](https://support.google.com/webmasters/answer/34592)

Bing 官方 AI Performance 的可见功能以实际属性为准：保留引用、被引 URL 与窗口；不得把 Citation Share 当访问份额或因果增长。[官方帮助](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c)

Google 当前抓取到的 AI features 指南仍说明 AI features 包含在 Web performance 中；与提案所述额外报表存在证据差异。账户是否出现新增功能只能进实际后台确认，本批不宣称已取得独立 AI 点击或查询数据。

Cloudflare 只确认站点已有 beacon，没有读后台数据。需要作者提供该属性的已登录访问或相关导出；没有推荐采购新工具。

## IndexNow 与分发

静态 Pages 可以在根目录托管验证 key 文本，因此技术上可实施。作者选择后生成真实 key，随批准候选发布，再提交实际 canonical URL；不能提前提交本地未发布的新页面。通知仅发送本批新增或有实质修订的规范地址，排除迁移页、参数过滤 URL、维护文件及 noindex 审阅应用。200 表示接收，202 表示等待 key 验证，均不等于索引保证。[协议](https://www.indexnow.org/documentation)

当前没有提交请求、key 文件、定时任务或外部发帖。RSS 已在站点和页脚提供。建议先使用既有订阅入口；是否创建新订阅产品、社区发帖或长期自动通知，是作者的投入与分发选择。
