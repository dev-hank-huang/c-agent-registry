# Dark / light 主題切換 — 設計文件

Status: approved by user (design phase), 2026-08-11.

## 目標

在 c-agent-registry 前端加上 dark/light 主題切換：

- 手動切換（Light / Dark）與跟隨系統偏好（System）都要支援。
- 使用者的選擇要持久化，重新整理頁面不能先閃一次錯的主題（FOUC）。
- Dark mode 的文字/狀態標籤對比度要符合 WCAG AA（4.5:1，一般文字）。
- 提供一個放置合理的切換 UI。

## 背景 / 現況

`frontend/src/design-system/tokens.css`（approved, Phase 2）已經是一份三層（primitive →
semantic → component）CSS 變數，且已經有一份**未經對比度驗證**的
`:root[data-theme="dark"]` 草稿區塊（隨 Phase 2 commit c50ef48 一起進來，非本次新增）。

現有畫面對 token 的採用程度不一：

- **已採用 token 的 Phase-3 畫面**（`ReviewQueue.tsx` 等）：直接用 `var(--status-*)` /
  `.badge` class，切 `data-theme` 屬性即可正確反應。
- **Pre-Phase-3 舊畫面**：整個 UI 完全是 Ant Design 元件 + 內聯 style 裡寫死的 hex
  （`#4338CA`／`#E4E6EC`／`#9AA0AC`／`#fff` 等），tokens.css 的檔頭註解本身也寫明
  「Existing pre-Phase-3 screens don't consume this yet — that's Phase 4」。純粹在
  tokens.css 加 dark 區塊，這些畫面不會有任何視覺變化。

因此本次工作範圍決定同時涵蓋：(1) 校正並確認 dark tokens、(2) 建立切換機制、
(3) 把 pre-Phase-3 畫面裡寫死的 hex 一併換成 token 讀取，讓 dark mode 在今天的實際畫面上
是完整生效的，而不只是打通了基礎設施。（對應之前與使用者確認的範圍選項 C。）

## 一、Dark tokens

### 方法論

沿用 tokens.css 既有 dark 草稿的技巧：中性灰階整組反轉、brand 色相在兩個主題間固定不變
（只有它的 on-brand-tint 配色隨主題換）、狀態色/圖表色調亮 8–12% 以維持在深色底上的可讀性。
本次工作只在**驗證出未過 WCAG AA 的 2 個值**上做校正，其餘沿用草稿既有值。

驗證方法：用 WCAG 相對亮度公式，對每一組「文字色 × 實際會出現的背景」算對比度，背景取
**最差情境**（例如 badge 文字疊在 `--bg-surface-3` hover/stripe 底色上，而非只測乾淨的
page 底色）。

### 對照表

#### Layer 1 — 中性灰階（整組反轉）

| Token | Light | Dark |
|---|---|---|
| `--p-gray-0` | `#fbfbfd` | `#14161c` |
| `--p-gray-50` | `#f4f5f8` | `#1b1e26` |
| `--p-gray-100` | `#eaebf1` | `#242833` |
| `--p-gray-200` | `#dcdee6` | `#343948` |
| `--p-gray-300` | `#c3c6d2` | `#454b5e` |
| `--p-gray-400` | `#9ca1b0` | `#7a8094` |
| `--p-gray-500` | `#7a8094` | `#9aa0b4` |
| `--p-gray-600` | `#5b6072` | `#b8bdce` |
| `--p-gray-700` | `#434757` | `#d3d6e0` |
| `--p-gray-800` | `#2b2e38` | `#e7e9ef` |
| `--p-gray-900` | `#14161c` | `#f7f8fa` |

#### Layer 2 — Semantic

| Token | Light | Dark | 對比度驗證（worst-case 背景） |
|---|---|---|---|
| `--bg-page` / `--bg-surface` | `#fbfbfd` | `#14161c` | — |
| `--bg-surface-2` | `#f4f5f8` | `#1b1e26` | — |
| `--bg-surface-3` | `#eaebf1` | `#242833` | — |
| `--bg-overlay` | `rgba(20,22,28,.5)` | `rgba(0,0,0,.6)` | — |
| `--fg-default` | `#14161c` | `#f7f8fa` | 17.0:1 on page ✅ |
| `--fg-muted` | `#5b6072` | `#b8bdce` | 7.9–9.7:1 ✅ |
| `--fg-subtle` | `#9ca1b0` | `#7a8094` | 4.2–4.6:1（light 本身只有 2.5:1；dark 已優於 light，沿用草稿值，不視為 blocker） |
| `--fg-on-brand-tint` | `--p-brand-700` | `--p-brand-300` (`#a5aef5`) | 7.1:1（實際 tint 混色底）✅ |
| `--color-brand` / hover / active | `#4338ca` / `#362da1` / `#2b2480` | 不變（brand 色相固定） | 只當 bg/border 用，未當文字色，不受影響 |
| `--color-brand-tint` | `--p-brand-50` | `color-mix(in srgb, brand-500 18%, transparent)` | 混實際底色後 6.5–7.1:1 ✅ |
| `--status-pending-fg` / `--status-pending-border` | `#b45309` / `#d3910f` | `#d99a3d` | 6.1–7.4:1 ✅ |
| `--status-success-fg` / `--status-success-border` | `#15803d` / `#1c9350` | `#34a85f` | 4.8–6.0:1 ✅ |
| **`--status-success-solid-bg`** | `#15803d` | ~~`#1f9455`~~ → **`#15803d`（沿用 light 同值）** | 白字 3.87:1 → **5.02:1** ✅ **修正** |
| **`--status-danger-fg`** / **`--status-danger-border`** | `#b91c1c` / `#d43d3d` | ~~`#e2585b`~~ → **`#e76a6d`** | 4.05:1 → **4.68:1**（`--bg-surface-3` worst case）✅ **修正** |
| `--status-info-fg` / `--status-info-border` | `#2e6fd9` | `#5a94e8` | 4.8–5.9:1 ✅ |
| `--status-neutral-fg` / `--status-neutral-border` | `--fg-muted` / `--border-strong` | 跟隨上面 | dark 版 `badge-neutral`（opacity 0.7）算出 4.6–5.3:1，優於 light 同款（2.9–3.2:1，light 既有、已核准） |
| `--chart-cat-1..5` | 見 tokens.css | `#4e8ce6` `#29b6a4` `#9470e8` `#e6a13a` `#e6659a` | 4.9–8.2:1 ✅ |
| `--chart-good` / `--chart-warning` | `--p-emerald-700` / `--p-amber-700` | `#34a85f` / `#d99a3d` | 沿用 success/pending ✅ |
| **`--chart-critical`** | `--p-red-700` | ~~`#e2585b`~~ → **`#e76a6d`**（與 danger 同步） | 一致性修正，原值 4.98:1 已過，改色只為與 status-danger 用同一個紅 |
| `--p-shadow-xs/sm/md/lg` | 見 tokens.css | 不透明度提高（`.3/.35/.45/.55`） | 非對比議題，沿用草稿 |

### 需要修改 tokens.css 的具體 diff

```diff
   --status-danger-fg: #e2585b;
-  --status-danger-border: #e2585b;
+  --status-danger-fg: #e76a6d;
+  --status-danger-border: #e76a6d;
   ...
-  --status-success-solid-bg: #1f9455;
+  --status-success-solid-bg: #15803d;
   ...
-  --chart-critical: #e2585b;
+  --chart-critical: #e76a6d;
```

其餘既有 dark 區塊值維持不變。

## 二、切換機制

### 儲存 / 解析

- `localStorage["theme"]`：`"light" | "dark" | "system"`；未設定時視同 `"system"`（首次造訪
  預設跟隨系統）。
- 「使用者選的模式」(`mode`) 與「實際套用的主題」(`resolvedTheme: "light"|"dark"`) 分開管理；
  `localStorage` 只存 `mode`，`resolvedTheme` 永遠即時算，避免存到過期的系統值。

### FOUC-safe boot script

`index.html` 的 `<head>` 第一個子節點插入一段同步、非 module 的 inline script（早於任何
`<link rel="stylesheet">`）：

```html
<head>
  <script>
    (function () {
      var stored = localStorage.getItem("theme");
      var resolved =
        stored === "light" || stored === "dark"
          ? stored
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      document.documentElement.setAttribute("data-theme", resolved);
    })();
  </script>
  <meta charset="UTF-8" />
  ...
```

React 端的初始化必須用**完全相同的解析邏輯**去讀 `data-theme`（讀 DOM 屬性，不重新算），
確保兩邊算出來的值一致、不會有 hydration 後二次翻轉。

### React 架構

新增 `src/theme/ThemeContext.tsx`，仿照現有 `src/auth/AuthContext.tsx` 的
`createContext` + provider + `useTheme()` hook 寫法：

```ts
type ThemeMode = "light" | "dark" | "system";
interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}
```

- 初始 state：`resolvedTheme` 直接讀 `document.documentElement.dataset.theme`；`mode` 讀
  `localStorage["theme"]`（缺省 `"system"`）。
- `mode === "system"` 時掛 `matchMedia("(prefers-color-scheme: dark)")` 的 `change`
  listener，即時更新 `resolvedTheme` 並同步 `data-theme` 屬性；非 system 模式不掛監聽。
- `setMode`：更新 state、寫入 `localStorage`、同步 `data-theme` 屬性。
- Provider 掛在 `main.tsx` 的 `<Root>` 最外層，`ConfigProvider` 之上。

### antd 同步

`ConfigProvider` 的 `algorithm` 需要跟著 `resolvedTheme` 切換，否則 pre-Phase-3 畫面裡的
antd 元件（Table/Modal/Select/Popconfirm/Tag…）不會變暗。新增
`src/design-system/antdTheme.ts`：

```ts
export function getAntdThemeConfig(resolvedTheme: "light" | "dark") {
  return {
    algorithm: resolvedTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: resolvedTheme === "dark" ? darkAntdTokens : lightAntdTokens,
  };
}
```

`lightAntdTokens` / `darkAntdTokens`：手動對齊本文件「Dark tokens 對照表」的 6–8 個 key
（`colorPrimary`、`colorBgContainer`、`colorBgLayout`、`colorBorder`、`colorText`、
`colorTextSecondary` 等）。這些值是字面量、不是 CSS 變數引用——antd 內部要用真實色值推算
hover/active 衍生色，餵 `var(...)` 進去算不出東西。

**已知維護債**：以後改 tokens.css 的 brand/gray 值，需要記得同步改這個檔案；檔案開頭會加
註解指回 tokens.css 提醒同步。範圍很小（brand-600 + 幾個 gray 階），不是本次要解的問題，
但明確記錄下來。

### 切換 UI

- **互動模式**：三態 `Segmented`（antd），非二態開關——Light / Dark / System 三選一，
  System 被選中時即時讀 `prefers-color-scheme` 並持續監聽 OS 主題變化。
- **元件庫選擇**：用 antd `Segmented`，跟旁邊 `LanguageSwitcher` 用的 `Dropdown`+`Button`
  同一套 antd 語彙，視覺一致。（COMPONENT_GUIDE.md 的 hybrid 原則是密集資料表面手拼、其餘
  維持 antd；這顆屬於「其餘」。）
- **圖示**：icon-only，用專案已有的 `lucide-react`（`Sun` / `Moon` / `Monitor`），每個選項
  帶 `title` / `aria-label`（新增 i18n key `theme.light` / `theme.dark` / `theme.system`）。
- **位置**：`AppLayout.tsx` 的 `Header` 右側 flex cluster，緊接在 `<LanguageSwitcher />`
  左邊——語言與主題都是「介面個人化偏好」，同一群組展示。這個 `<Header>` 桌面/手機共用，
  不用另外處理手機版位置。

```
┌──────────────┐
│ ☀️ │ 🌙 │ 🖥️ │  ← Segmented，active 那格有底色
└──────────────┘
```

## 三、既有畫面遷移範圍

把下列檔案裡寫死的 hex／antd 預設色改為讀取 token：

- `frontend/src/components/AppLayout.tsx`
- `frontend/src/components/AgentsTable.tsx`
- `frontend/src/components/tags.tsx`（7 處 antd `color="blue"/"success"/"error"/...`
  預設色 → 改用 `--status-*` / `components.css` 的 `.badge-*` class）
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/AgentDetail.tsx`
- `frontend/src/pages/VersionDetail.tsx`
- `frontend/src/pages/Skills.tsx`
- `frontend/src/pages/ReviewDetail.tsx`
- `frontend/src/pages/RegistryMcps.tsx`
- `frontend/src/pages/RegistryModels.tsx`
- `frontend/src/pages/RegistrySkills.tsx`
- `frontend/src/main.tsx`（`ConfigProvider` 的 `colorPrimary: "#4338CA"` 硬編碼 →
  `getAntdThemeConfig`）

`frontend/src/pages/ReviewQueue.tsx` 已經是用 `var(--status-*)` / `.badge` 寫的
（Phase-3 畫面），不用動——這也是使用者最初提到「review queue 狀態色」實際對應的檔案，
已在上面對照表驗證過 AA。

## 不在範圍內

- Phase 4 的其餘一般性重構（把所有畫面完整搬到 hand-rolled 語意 HTML）——本次只解決 dark
  mode 需要碰到的 hex/antd 預設色，不做超出這個目的的額外重構。
- `--border-default` / `--border-strong` 在兩個主題下都未達 WCAG 1.4.11 非文字 3:1
  門檻（light 1.3:1、dark 1.6–2.1:1）——這是繼承自已核准的 light token 既有決定，非本次
  引入的退化，不在本次修正範圍。
- Chart 色（`--chart-cat-*`）尚未跑過色盲（CVD）驗證器——tokens.css 檔頭本身已註記這是
  Phase 3 開始畫圖表時才要做的事，跟 dark mode 無關，維持原排程。

## 測試 / 驗收

- 手動：切換 Light/Dark/System，確認 `ReviewQueue.tsx` 的狀態徽章、`tags.tsx` 系列標籤、
  遷移清單裡每個畫面的可讀性；System 模式下改 OS 主題，頁面要即時跟著變。
- 重新整理頁面（含直接網址進入非首頁路由）在 Dark 模式下不能看到任何一幀 Light 底色。
- 用瀏覽器 devtools 的 contrast checker 抽測遷移清單裡幾個畫面的文字/背景組合，跟本文件
  對照表數字一致。
