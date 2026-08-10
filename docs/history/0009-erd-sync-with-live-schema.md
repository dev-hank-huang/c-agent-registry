# 0009 — idea.drawio 的 ERD 同步成目前 PostgreSQL 的實際 schema

**Commit**: `0f71324` · 2026-08-10

## 做了什麼

使用者要求依照目前 PostgreSQL 裡 `agent-registry` 的實際 table schema，重新整理
`idea.drawio` 的 ERD 圖。原本的圖是專案早期畫的草稿，後來 model 一路加欄位（`deleted_at`、
`slug`、`email`/`hashed_password` 等）都沒有回頭同步回圖上，兩邊已經明顯對不上。

對照 `backend/app/models/*.py` 逐一比對後，用程式（一次性 Python script）重新產生整份 ERD，
而不是手動一格一格改既有的 mxCell——8 張表（`agents`、`agent_versions`、`users`、
`user_agent_rels`、`reviews`、`skills`、`mcps`、`agent_dependencies`）的欄位全部重新對齊實際
model 定義，順便修正兩個既有的打字錯誤（`Review.priorital` → `priority`、
`Agent_Dependency.dependcy_id`/`Skill.mcp_dependcy` → `dependency_id`/`mcp_dependency`）。
角色圖例也一併更新：原本畫的是改版前的三值 `AssetRole`（owner/editor/reviewer），換成現在的
兩層角色模型（系統角色 `User.role`：admin/reviewer/member；per-agent 角色
`UserAgentRel.role`：owner/editor 兩種）。

## 為什麼

ERD 是 `docs/architecture.md` 明講的「規格與實作落差」對照基準，圖跟實際 schema 對不上，之後
任何人要靠這張圖理解資料模型都會被誤導。用程式重新產生而不是手動改，是因為原圖裡有上百個
`mxCell`（每個欄位都是好幾個 cell 組成），手動追蹤哪些要加、哪些要刪很容易出錯；寫一次性腳本
從 model 定義出發組出完整 XML，可以保證跟實際欄位一致。

## 驗證

產生後用 `xml.etree.ElementTree` 解析確認 XML 合法、8 張表都在、每條關聯線的 source/target
都能解析到正確的表格 id，沒有懸空連線。
