---
layout: doc
---

# Connection Pool

## User Outline

- 說明 Connection Pool 的概念與使用方式
  - 說明通常用在 Swoole 的單 process 多線程模式下，避免每次請求都要建立新的資料庫連線
  - 說明軟體實作 pool 的限制，嚴謹的需求可以考慮 ProxySQL 等專門的連線池軟體
- 說明如何在 Swoole 的多線程模式下，使用 Connection Pool
  - 設定檔說明，建議的 connections 數量
  - 如何除錯
  - 各類 Windwalker DB Connection Pool 內建 features 介紹
- Transaction 如何運作
  - 說明 Database 如何 keep connection
- 任何你覺得值得追加的項目
