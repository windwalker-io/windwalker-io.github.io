---
layout: doc
---

# Views

## User Outline

- 這裡的 View 是指綁定在 routing 上面的整頁 MVC Page View，若需要臨時性 render layout or widget，請見 Renderer 文件
  - 通常 Page View 會搭配 ViewModel 來使用，ViewModel 會提供給 View 所需要的資料
- 介紹 Windwalker MVC Page ViewModal & templates 如何與其他 MVC 檔案擺放
  - 同時也會有 assets 目錄用來擺放 ts, scss 等檔案 
- ViewModel 介紹
  - ViewModel 的基本概念、用法
  - ViewModel 如何自訂 properties 與 methods 在 templates 內呼叫
  - ViewModel 如何指定目標 templates 入口，或是根據 input 動態指定
  - 基本的 extends global body 方式 (更詳細的移動到 Edge Templates 文件)
  - ViewModel 如何注入其他 service，ex: Services, Repository
  - ViewModel 如何綁定 ts & scss，細節可以看 frontend 文件
  - ViewModel 如何使用 HtmlFrame 或 #[ViewMetadata] 來宣告 metadata
  - 多開一個 `HtmlFrame` 頁面來專注介紹這個物件的使用方式
- 任何你覺得值得追加的項目
