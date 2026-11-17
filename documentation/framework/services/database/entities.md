---
layout: doc
---

# Entities

## User Outline

- 介紹建立 entity 的指令
  - 說明一開始是空的 entity，Windwalker 的邏輯是以 migrations 最終結果作為 truth，所以 必須搭配 migrations 建立完 tables 後，再回頭 sync columns 到 entity，才會有欄位
  - 這裡提供一個基本範例讓使用者可以操作
  - 完成 migrations 後，執行 `build:entity` 建立 properties，可以趁這時候手動改 casting & types，之後 `build:entity -k` 建立 hook getter / setter
  - 多個 primary keys 時，如何用 `#[PK]` 標註這些 keys
- entity 的基本概念，如何使用 entity 來操作資料庫
  - 詳細的讀寫資料庫方式，都可以連結到 database & ORM 的 component 文件
- 如何善用 entity 的 hook，來做一些自動化的欄位處理
  - 例如 created / modified / created_by / modified_by 等欄位的自動處理
  - computed property 的使用方式，如何在 entity 內部做一些自動化的欄位計算
  - 介紹一些 app 層內才能用的 attributes
- Enum 欄位
  - 如何搭配 Enum 來使用，並且在 entity 層面做一些自動化的轉換
  - 介紹 Windwalker 的 Enum 類別，如何建立自己的 Enum 類別
- JSON 欄位與結構化欄位
  - 如何搭配 SQL json 欄位使用
  - 如何將 json wrap 進 RecordInterface 為基礎的自訂物件中
- DateTime 處理
- Entity 的 serialization
  - 參考 core-concepts/api-systems/object-serialization.md 
- 任何你覺得值得追加的項目
