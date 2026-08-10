# 0010 — Registry 分類（Skill / MCP / Model）+ 同步機制

**Commit**: `9445703` · 2026-08-10

## 做了什麼

使用者要求兩件事：(1) 把 skill/mcp 的清單改成只顯示「可用」的項目；(2) 左側 sidebar 新增一個
「Registry」分類，底下 Skill / MCP / Model 三個獨立頁面，各自有一個「同步」按鈕，同步後畫面上
要看得到同步狀況（上次同步時間、可用/不可用數量）跟每個項目目前的狀態。

跟使用者確認過的範圍：同步先做「內部狀態同步」（不接外部系統，重新驗證資料庫裡現有項目還堪不堪
用），Model registry 代表 LLM 模型清單（全新實體），原本的 `/skills` 頁面直接移除、功能整合進新
頁面，Skill/MCP/Model 都加一個可用狀態欄位。

**後端**：

- 新增 `AvailabilityStatus` enum（`available`/`unavailable`），`Skill`、`MCP` 各加
  `status` + `last_synced_at` 欄位。
- 新增 `AIModel`（table `ai_models`）——第三個 registry 實體，欄位
  `name`/`provider`/`model_id`/`description`/`category`/`tags`/`created_by`/`status`/
  `last_synced_at`。類別命名成 `AIModel` 而不是 `Model`，避免跟 `app.models` package、
  Pydantic `BaseModel` 撞名。
- `services/storage.py` 新增 `object_exists()`（MinIO `stat_object` + 抓 `NoSuchKey`）。
- 三個整批同步端點：`POST /skills/sync`（檢查 MinIO 檔案是否還在）、`POST /mcps/sync`（http(s)
  host 打 HEAD 探測，非 http(s) 一律視為可用）、`POST /models/sync`（目前沒有外部 provider API，
  先驗證 `model_id` 非空當作恆真的可用性檢查，留作未來擴充點）。
- Alembic migration：先合併兩個先前分岔的 head（`2a62135bfd8f` 與 `62a1917c0a90`，這是這次開發
  過程中發現的既有問題，不是這次改動造成的），再加上 `status`/`last_synced_at` 兩欄跟
  `ai_models` 表。

**前端**：

- `RegistrySkills.tsx`/`RegistryMcps.tsx`/`RegistryModels.tsx` 三個新頁面取代原本的
  `Skills.tsx`：同步按鈕、同步狀態列（上次同步時間、可用/不可用數量，即時從目前清單資料算出）、
  「顯示不可用項目」開關（預設關閉，只顯示可用的）、狀態欄位（綠色可用/紅色不可用 Tag）。
- Sidebar 新增「Registry」分類（`DatabaseOutlined` icon），底下 Skill/MCP/Model 三個子項目。
- `VersionDetail.tsx` 幫版本選依賴的下拉選單（Skill/MCP 兩種）過濾成只顯示 `status=available`
  的項目——這是比 Registry 頁面本身更關鍵的正確性修正，避免選到一個已經不可用的依賴。

## 為什麼

Claude.md 的「skill/mcp page」只說「顯示目前 DB 中有的資料內容」，但沒有處理「資料還堪不堪用」
這件事——一個 skill 的檔案可能因為各種原因從 MinIO 消失、一個 MCP 的 host 可能停機，這種情況下
繼續讓使用者在建立/編輯 agent version 時選到它們是個真正的功能缺陷，不只是 UI 好不好看的問題。
Model registry 是使用者這次追加的新需求，設計上刻意跟 Skill/MCP 對齊（同樣的可用狀態欄位、同樣的
同步端點形狀），保持三個 registry 概念上一致，之後如果要加第四個 registry 種類，照同樣的 pattern
複製就好。

## 驗證

`uv run pytest`：新增 `test_registry_sync.py`，涵蓋 skill 上傳後預設 available、手動從 MinIO
刪除物件後同步變成 unavailable；mcp host 是打不通的位址（`http://127.0.0.1:1`）同步後變
unavailable，非 http(s) 字串維持 available；model 建立+同步後狀態正確、`last_synced_at` 有值。
全部 43 個測試通過。另外在瀏覽器對著真的跑起來的服務走了一次：三個 Registry 頁面都建立一筆資料、
按同步、確認狀態與統計數字正確；到一個 agent version 選依賴，確認 MCP 下拉選單因為當時資料庫裡
唯一的 MCP 是 unavailable 而正確顯示「無資料」；全程 console 沒有任何錯誤。
