---
layout: doc
---

# CSRF/CORS Protection

## User Outline

- CSRF Protection 的基本知識與原理，Windwalker 中如何實作?
- 如何整合已有的 CSRF Middleware 與 Edge 內的 csrf directive or csrf component
  - 如何排除頁面
- 如何注入 CSRF service 手動使用
  - 何時 CSRF token 會失效，如何手動刷新
  - 如何手動驗證 CSRF? 有哪些方式可以發送與取用 token?
- JS 端如何使用 CSRF token，如何整合到前端框架
  - 介紹 Unicorn 的 http client 如何自動帶入 CSRF token
  - 提到跨域 CORS 的概念，CORS 是否可以在跨域時替代 CSRF? 後續細節連到 API Systems 頁面
- 任何你覺得值得追加的項目
