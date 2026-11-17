---
layout: doc
---

# Getting Started

## User Outline

- Windwalker Database 如何啟動與使用， Components 文件連結
  - 要安裝 `windwalker/database` 與 `windwalker/orm` (建議)
  - `windwlaker/query` 是必備安裝，會一起裝起來
- 設定檔介紹
  - 支援 PDO 與一些傳統 driver，列出所有選項 
  - 如何設定 database connection，並使用 env 變數
  - 如何用 DSN 取代傳統的 host / port / user / password 設定
  - MySQL strict mode 等等設定
  - TLS / SSL 設定
  - SQLite 的設定
  - 各大資料庫設定差異
- 基本使用方式
  - 如何注入 DatabaseAdapter / ORM
  - 兩者差異在哪裡
  - 非常基本的 select / insert / update / delete 使用方式
  - transaction 使用方式
  - 其他一些非常基本的用法介紹
- 任何你覺得值得追加的項目
