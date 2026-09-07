<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HARD LOCK: 七语 + Google/Bing 收录

任何加改（页面、文案、路由、中间件、sitemap、新闻、FAQ、对比）必须同时满足：

1. `messages/{en,es,cn,tw,th,vi,pt}.json` 七语 key 对齐，禁止只写一种语言。
2. 可索引 URL 稳定 200，不因 cookie / `Accept-Language` 互跳。保持 `localeDetection: false`、`localeCookie: false`。
3. 新路由写入 `sitemap.ts` 七语 hreflang，并有站内链接。对比页必须是 C(n,2) 全量矩阵，不是 6 张热门卡。

详见 `.cursor/rules/traffic-i18n-seo.mdc`。流量是核心，收录失败则改动不算完成。

