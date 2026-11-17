---
layout: doc
---

# Asset Management

## User Outline

- 介紹 Windwalker AssetService 的最基本本使用方式
  - 直接在 template 內的 global variable `assets` 來使用
  - 在任何地方注入 `AssetService` 來使用 (通常是在 ViewModel 內)
- 介紹 Windwalker AssetService 的設定檔位置與設定方式
- 一般模式下 Asset 路徑介紹
  - css/js/images/fonts/ 等資源擺放位置與輸出位置
  - 程式內如何引用他們
  - 如何強制用 uri 覆蓋 assets 網址
  - 如何加上 defer 或 hash 參數，如何將 js 改 footer output
- Vite 模式下 Asset 路徑介紹
  - css/js/images/fonts/ 等資源擺放位置與輸出位置
  - 程式內如何引用他們
  - 更詳細的介紹連結到 frontend 相關文件
- 在 core 的 instructions 內也可以找到更多的 asset 相關介紹。frontend 章節的 style & assets 也有詳細路徑介紹
- 任何你覺得值得追加的項目
