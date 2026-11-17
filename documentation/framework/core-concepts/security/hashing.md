---
layout: doc
---

# Hashing

## User Outline

- Hasher 概念基本說明，主要是用哪個演算法與內建 functions?
  - 如何注入與使用
  - 設定檔介紹 (crypt.config.php)
  - 如何擴增設定檔 factories
  - 一些常見的安全錯誤觀念解說
- 如何使用 HasherInterface ，使用範例等
  - 該選擇什麼演算法? 如何使用 default 讓 php 自己選擇演算法
  - 如何比對 hash 與原始資料 (說明為什麼不應該用 === 來比對)
- 如何用 HasherInterface 整合外部 hash 套件，例如 blake2 等
- 說明不需要把 HasherInterface 也當成雜湊去重工具，因為太重，單純用 hash() 效果很好
- 介紹 `PasswordHasher::genRandomPassword()` 可以當作方便的臨時隨機密碼產生器使用
- 任何你覺得值得追加的項目
