---
layout: doc
---

# Migrations

## User Outline

- Migrations 概念說明
- 如何建立新的 migration
  - 如何編寫 migration 
  - 如何注入 DatabaseAdapter / ORM & services
  - Schema 定義方式連結到 Components 的 Schema 文件
- 如何執行 migration
  - 如何關閉預設的 backup 行為
  - 說明 migration 會自動建立資料庫，如何關閉這個預設行為
  - 如何指定特定目錄、檔案與 package
  - 啟用 migration 的 sql log
- 觀看 migration status
- 如何回滾 migration 或 reset migration
- 如何在執行 migration 時，同時執行 seeder
- 任何你覺得值得追加的項目
