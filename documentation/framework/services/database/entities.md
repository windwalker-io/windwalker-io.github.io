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
- 各類常用欄位類型
  - Enum 欄位
    - 如何搭配 Enum 來使用，並且在 entity 層面做一些自動化的轉換
    - 介紹 Windwalker 的 Enum 類別，如何建立自己的 Enum 類別
  - JSON 欄位與結構化 Record 欄位
    - 會自動產生 #[JsonObject] ，但 Record type 要自己掛上去
    - 如果需要 $[JsonArry]，也可以自己改
    - 如何將 json wrap 進 RecordInterface 為基礎的自訂物件中
  - DateTime 處理
    - 會自動產生 Chronos 欄位
    - 建議欄位 nullable 不要用 null-date
    - serialize 後的格式
    - 可以直接吃 zoned 的字串回來，用 ServerTimeCast 自動轉回 UTC
  - Date
    - 可以用 Temporal like 的 PlainDate 存放 (支援自動產生)
  - Time
    - 可以用 Temporal like 的 PlainTime 存放 (支援自動產生)
  - String MonthDay
    - 單純用 string 來存月日等格式，也可以用 Temporal like 的 PlainMonthDay 存放，只是要手動編寫
- Entity 的 serialization
  - 參考 core-concepts/api-systems/object-serialization.md 
- 任何你覺得值得追加的項目
