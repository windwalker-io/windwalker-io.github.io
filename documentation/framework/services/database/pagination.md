---
layout: doc
---

# Pagination

## User Outline

- 參考舊文件 https://windwalker.io/site-legacy/documentation/3.x/more/pagination.html 在開頭用簡單介紹 pagination 需要取得的資訊，SQL 範例，最後再介紹 windwalker 的 pagination 服務
- 標準的 Pagination 建立方式 PaginationResult 取得後內容有哪些
  - 如何搭配 Windwalker Database & Query Builder 使用
  - Blade 顯示範例
  - 如何切換 layout，如何自訂 routing
  - pagination item name 各代表什麼意思，可以搭配這張圖 https://cloud.githubusercontent.com/assets/1639206/5594615/131c1546-928e-11e4-8103-f90e73f4428d.jpg
- Simple 版本
  - 完整計算 total 的缺點，不用 total 的優缺點 
  - 如何使用 Simple 版本? 如何避免計算 total 造成的效能問題
  - Blade 顯示範例
- Cursor Pagination
  - Cursor Pagination 的優缺點
  - 如何使用 Cursor Pagination?
  - 要在 input 吃哪些資訊近來
  - Blade 顯示範例，page link 如何建立
- AJAX & API
  - 如何在 API response 中使用 pagination 提供 header 資訊
  - 如何在 API response 中使用 cursor pagination 
- 任何你覺得值得追加的項目
