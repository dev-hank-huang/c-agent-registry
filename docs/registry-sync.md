# Registry 同步設計（Skill / MCP / Model）

左側 sidebar 的「Registry」分類底下有三個獨立頁面——Skill、MCP、Model——各自對應一張資料表
（`skills`、`mcps`、`ai_models`），結構是平行的：清單、新增、一個「同步」按鈕。這份文件記錄同步
機制怎麼設計、為什麼。

## 可用狀態欄位

`Skill`、`MCP`、`AIModel` 三張表都加了兩個欄位（`backend/app/models/enums.py` 的
`AvailabilityStatus`）：

- `status`：`available` / `unavailable`，新建立時預設 `available`。
- `last_synced_at`：nullable，第一次按「同步」之前是 `null`。

前端三個 Registry 頁面預設**只顯示 `status=available` 的項目**——這是這次改動的直接動機：以前
`/skills` 頁面不管資料庫裡的東西還堪不堪用，全部列出來，使用者在 agent version 選依賴時可能選到
一個檔案已經從 MinIO 消失的 skill，或連不上的 MCP host。現在：

- Registry 頁面本身有個「顯示不可用項目」開關（預設關閉），關掉時只看得到可用的；打開才看得到
  不可用的項目（方便知道同步後到底是哪些壞了）。
- `frontend/src/pages/VersionDetail.tsx` 幫版本選依賴的下拉選單（`Skill`/`MCP` 兩種類型）直接
  過濾成只有 `status === "available"` 的選項，不管 Registry 頁面的開關狀態——這裡沒有「顯示不可用」
  的例外，因為選一個不可用的依賴本來就沒有意義。

## 同步是整批（bulk），一個按鈕對應一整類

三個同步端點都是 `POST /{skills|mcps|models}/sync`，沒有「同步單一項目」的版本——原因是使用者的
需求是「每個頁面一個同步按鈕」，不是逐列同步。端點邏輯統一是：撈這個分類目前資料庫裡所有的項目，
對每一筆做可用性檢查，寫回 `status` + `last_synced_at`，最後一次 commit，回傳
`{synced_at, total, available, unavailable, items}`。

前端「上次同步時間」跟「可用/不可用數量」不是另外存一張 sync-run 歷史表算出來的，是直接從目前這批
`items` 的 `last_synced_at`/`status` 即時算（`RegistrySkills.tsx` 等三個頁面裡的
`useMemo`）——重新整理頁面後數字還是對的，不需要額外的後端狀態。

## 各類別的可用性檢查邏輯

**這是目前設計裡最會隨時間演進的部分**——現在沒有接任何外部系統，同步的意義是「重新驗證資料庫裡
已經有的東西是不是還堪用」，不是「從外部來源拉新資料」。之後如果要接外部來源（例如真正的 MCP
registry、provider 的 model list API），改動點就在下面三個檢查函式內部，端點的介面（bulk sync、
回傳格式）不用動：

- **Skill**（`backend/app/api/v1/endpoints/skills.py` `sync_skills`）：呼叫
  `services/storage.object_exists(bucket, object_name)`（新增的 helper，`stat_object` +
  抓 `S3Error` 的 `NoSuchKey`）檢查 `bucket_path` 對應的檔案是不是還在 MinIO 的 skills bucket
  裡。檔案被手動刪掉或 bucket 被清空，同步後就會變 `unavailable`。
- **MCP**（`mcps.py` `sync_mcps` / `_check_reachable`）：`host` 欄位的格式不保證是網路位址（可能是
  stdio 指令，例如 `npx some-mcp-server`），所以用啟發式判斷——`http://`/`https://` 開頭的才真的用
  `httpx.AsyncClient`（3 秒 timeout）打一次 HEAD 請求，連得上（不管回傳什麼 status code）算
  available，連線失敗/timeout 算 unavailable；不是 http(s) 開頭的一律當作 available，因為沒辦法
  真的驗證，不應該把合法的 stdio MCP 誤判成壞掉。
- **Model**（`ai_models.py` `sync_models`）：目前沒有任何 provider API 可以打，所以檢查只是驗證
  `model_id` 非空（本來就是必填欄位，等於恆真）並蓋 `last_synced_at`。這是刻意留白的擴充點——之後
  要接 provider（Anthropic/OpenAI/…）的 model list API 驗證這個 model 是否還存在時，改的就是這個
  函式內部。

## 權限

三個 sync 端點跟 Skill/MCP 現有的 create/list 端點一樣，只要求 `Depends(get_current_user)`（任何
登入使用者都能觸發），沒有另外限制成 reviewer/admin only——這是沿用現有程式碼的慣例（Skill/MCP 本來
就是任何人都能新增的共用登錄表），Claude.md 也沒有把這幾個動作列為需要限制角色的項目。
