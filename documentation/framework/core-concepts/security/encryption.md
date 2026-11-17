---
layout: doc
---

# Encryption

## User Outline

- Crypt 使用了什麼 component 與 extension，基本運作原理是什麼
  - 如何注入
  - 設定檔介紹 (crypt.config.php)
  - 如何擴增設定檔 factories
  - 一些常見的安全錯誤觀念解說
- 如何使用 CipherInterface ，使用範例等
  - 該選擇什麼 cipher (在目前只推薦 sodium cipher)
  - 如何建立 key 與存放 key
  - 如何加密與解密資料
  - 如何加密與解密檔案
  - 如何加密與解密資料庫欄位
- 如何用 CipherInterface 整合外部的加密套件，例如 Halite phpencryption 等
- 如何輪換 key?
  - 如何建立一個可以 try 舊 keys 的 CipherInterface
- 任何你覺得值得追加的項目
