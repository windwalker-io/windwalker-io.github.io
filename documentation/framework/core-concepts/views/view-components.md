---
layout: doc
---

# View Components

## User Outline

- Views Components 介紹
  - 這裡指的是 Edge Components 系統，以及在 Windwalker 中的進階使用方式
  - 標準 class components 可以簡單介紹，詳細連結到 Edge Components 文件
- 註冊 components
  - 一般 anonymous components 如何尋路，如何增加尋路的 paths
  - 如何用 alias `@foo` 將 layout path 轉成單一名稱的 components
  - 如何手動註冊 class components
  - 如何用 `#[ViewComponent]` 自動註冊 class components，編輯後快取失效說明
  - Edge Components 那邊可以加註說明，在 Windwalker 支援自動 discover components
- Class Components 介紹
  - 如何自訂 properties 與 methods 在 templates 內呼叫
  - 如何注入其他 service，ex: Services, Repository
  - 如何用 AssetService 載入 ts & scss，如何用 blade macro
- 任何你覺得值得追加的項目
