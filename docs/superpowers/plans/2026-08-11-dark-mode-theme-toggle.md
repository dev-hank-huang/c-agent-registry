# Dark/Light Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual + system-following dark/light theme toggle to the c-agent-registry frontend, with WCAG AA-compliant dark colors, no flash-of-wrong-theme on reload, and correct rendering on today's actual screens (not just the token infrastructure).

**Architecture:** A tri-state (`light`/`dark`/`system`) preference stored in `localStorage["theme"]`, applied via a `data-theme` attribute on `<html>`. A synchronous inline script in `index.html` resolves and applies that attribute before first paint (FOUC guard). A React `ThemeContext` re-derives the same value for component state (zero mismatch with the boot script) and listens for OS theme changes while in `system` mode. Ant Design's `ConfigProvider` algorithm/token set switches in lockstep so antd-only screens repaint correctly too. Pre-Phase-3 screens with hardcoded hex colors are migrated to read the same CSS custom properties so dark mode is visually complete today, not deferred to Phase 4.

**Tech Stack:** React 19, Ant Design v6 (`ConfigProvider`, `Segmented`), `lucide-react` icons, `react-i18next`, plain CSS custom properties (`frontend/src/design-system/tokens.css`). No new dependencies.

## Global Constraints

- Dark token values must be exactly the ones validated in `docs/superpowers/specs/2026-08-11-dark-mode-theme-design.md` — do not re-derive or re-tune colors during implementation.
- `localStorage` key is `"theme"`, values `"light" | "dark" | "system"`, default (absent key) is `"system"`.
- Only `background`/`color`/`border`-related hex literals are in scope for the file migration tasks (Tasks 7–14). Do not touch unrelated `fontSize`/`padding`/`borderRadius`/`gap` literals in those files — that's Phase 4 scope, not this plan's.
- This repo has no automated test runner (`package.json` defines no `test` script, no vitest/jest present) and the approved spec's verification section is manual (dev server + browser devtools). Every task below ends in an explicit manual verification step instead of an automated test run — that's a deliberate match to the approved spec, not a skipped step.
- Every new/changed color must go through a CSS custom property or the `antdTheme.ts` token map — never introduce a new hardcoded hex.

---

## File structure

| File | Change |
|---|---|
| `frontend/src/design-system/tokens.css` | Modify — 3 corrected dark hex values |
| `frontend/index.html` | Modify — add FOUC-guard boot script |
| `frontend/src/theme/ThemeContext.tsx` | Create — `resolveTheme()`, `ThemeProvider`, `useTheme()` |
| `frontend/src/design-system/antdTheme.ts` | Create — light/dark antd `ThemeConfig` maps |
| `frontend/src/main.tsx` | Modify — wrap in `ThemeProvider`, drive `ConfigProvider` from `getAntdThemeConfig()` |
| `frontend/src/components/ThemeToggle.tsx` | Create — tri-state `Segmented` control |
| `frontend/src/i18n/locales/en.json`, `zh.json` | Modify — add `nav.theme*` keys |
| `frontend/src/components/AppLayout.tsx` | Modify — hex→token, mount `<ThemeToggle />` |
| `frontend/src/components/AgentsTable.tsx` | Modify — hex→token |
| `frontend/src/components/tags.tsx` | Modify — status tags use `.badge-*` classes instead of antd preset colors |
| `frontend/src/pages/Login.tsx` | Modify — hex→token |
| `frontend/src/pages/AgentDetail.tsx` | Modify — hex→token |
| `frontend/src/pages/VersionDetail.tsx` | Modify — hex→token |
| `frontend/src/pages/Skills.tsx`, `ReviewDetail.tsx` | Modify — hex→token |
| `frontend/src/pages/RegistryMcps.tsx`, `RegistryModels.tsx`, `RegistrySkills.tsx` | Modify — hex→token |

**Deliberate scope note on `tags.tsx`:** only the four components that render actual *status* (`VersionStatusTag`, `VisibilityTag`, `UserStatusTag`, `ReviewResultTag`) move to `.badge-*` classes — those map cleanly onto the WCAG-audited `--status-*` tokens. `AssetRoleTag`/`UserRoleTag` render *roles* (owner/admin/reviewer/member), which have no `--status-*` equivalent in the token system; forcing them onto mismatched status colors would be worse than leaving them on antd's own preset `Tag` colors, which already repaint correctly once `ConfigProvider`'s algorithm switches to `darkAlgorithm` (Task 5). This satisfies the spec's actual concern — status-label readability — without inventing tokens the spec never designed.

---

### Task 1: Correct the dark token values in `tokens.css`

**Files:**
- Modify: `frontend/src/design-system/tokens.css:219-236`

**Interfaces:**
- Produces: `--status-danger-fg`, `--status-danger-border`, `--status-success-solid-bg`, `--chart-critical` — consumed by `components.css` (`.badge-danger`, `.badge-success-solid`) and every task below that renders those badge classes.

- [ ] **Step 1: Apply the 3 corrected values**

In `frontend/src/design-system/tokens.css`, inside the `:root[data-theme="dark"]` block:

```diff
   --status-pending-fg: #d99a3d;
   --status-pending-border: #d99a3d;
   --status-success-fg: #34a85f;
   --status-success-border: #34a85f;
-  --status-success-solid-bg: #1f9455;
-  --status-danger-fg: #e2585b;
-  --status-danger-border: #e2585b;
+  --status-success-solid-bg: #15803d;
+  --status-danger-fg: #e76a6d;
+  --status-danger-border: #e76a6d;
   --status-info-fg: #5a94e8;
   --status-info-border: #5a94e8;

   --chart-cat-1: #4e8ce6;
   --chart-cat-2: #29b6a4;
   --chart-cat-3: #9470e8;
   --chart-cat-4: #e6a13a;
   --chart-cat-5: #e6659a;
   --chart-good: #34a85f;
   --chart-warning: #d99a3d;
-  --chart-critical: #e2585b;
+  --chart-critical: #e76a6d;
```

- [ ] **Step 2: Manual verification**

Run `cd frontend && npm run dev`, open `http://localhost:5173`, open devtools console and run:

```js
document.documentElement.setAttribute("data-theme", "dark");
getComputedStyle(document.documentElement).getPropertyValue("--status-danger-fg").trim();
```

Expected output: `"#e76a6d"`. Repeat for `--status-success-solid-bg` → `"#15803d"`, `--chart-critical` → `"#e76a6d"`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/design-system/tokens.css
git commit -m "fix(tokens): correct dark status colors to meet WCAG AA

--status-success-solid-bg and --status-danger-fg/border in the dark
theme draft were under 4.5:1 against their worst-case backgrounds
(white text on solid-fill, and danger text on the hover/stripe row
background). Values corrected per docs/superpowers/specs/2026-08-11-dark-mode-theme-design.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: FOUC-guard boot script in `index.html`

**Files:**
- Modify: `frontend/index.html`

**Interfaces:**
- Produces: `document.documentElement` carries a `data-theme="light"|"dark"` attribute before first paint. Task 3's `ThemeProvider` reads this same attribute as its initial React state.

- [ ] **Step 1: Add the inline script as the first child of `<head>`**

```diff
 <!doctype html>
 <html lang="en">
   <head>
+    <script>
+      (function () {
+        // Kept in lockstep with resolveTheme() in
+        // frontend/src/theme/ThemeContext.tsx — both must resolve the same
+        // stored value + system preference to the same theme, or the page
+        // flashes the wrong theme between this script and React mounting.
+        var stored = localStorage.getItem("theme");
+        var resolved =
+          stored === "light" || stored === "dark"
+            ? stored
+            : window.matchMedia("(prefers-color-scheme: dark)").matches
+              ? "dark"
+              : "light";
+        document.documentElement.setAttribute("data-theme", resolved);
+      })();
+    </script>
     <meta charset="UTF-8" />
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     <title>Agent Registry</title>
   </head>
   <body>
     <div id="root"></div>
     <script type="module" src="/src/main.tsx"></script>
   </body>
 </html>
```

- [ ] **Step 2: Manual verification**

```bash
cd frontend && npm run dev
```

In a browser devtools console, before the app finishes loading (Network tab throttled to "Slow 3G" makes this easy to catch), confirm `document.documentElement.getAttribute("data-theme")` is already `"light"` or `"dark"` immediately on navigation — never `null`. Then:

1. `localStorage.setItem("theme", "dark")`, reload the page. Page must render dark from the very first frame (no white flash).
2. `localStorage.removeItem("theme")`, set OS to dark mode, reload. Page must render dark (system fallback working pre-React).

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html
git commit -m "feat(theme): add FOUC-guard boot script to index.html

Synchronous inline script, first child of <head>, resolves stored
theme preference or system preference and sets data-theme on <html>
before any stylesheet paints.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `ThemeContext` — resolution logic, provider, hook

**Files:**
- Create: `frontend/src/theme/ThemeContext.tsx`

**Interfaces:**
- Produces:
  - `export type ThemeMode = "light" | "dark" | "system"`
  - `export function resolveTheme(stored: string | null, prefersDark: boolean): "light" | "dark"`
  - `export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element`
  - `export function useTheme(): { mode: ThemeMode; resolvedTheme: "light" | "dark"; setMode: (mode: ThemeMode) => void }`
- Consumes: nothing from other tasks (self-contained). Consumed by Task 5 (`main.tsx`) and Task 6 (`ThemeToggle.tsx`).

- [ ] **Step 1: Create the file**

```tsx
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

// Kept in lockstep with the inline boot script in index.html — both must
// resolve the same stored value + system preference to the same theme, or
// the page flashes the wrong theme between that script and React mounting.
export function resolveTheme(stored: string | null, prefersDark: boolean): ResolvedTheme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  // Read the attribute the boot script already set — never recompute here,
  // so React's first render always matches what's already painted.
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    () => (document.documentElement.getAttribute("data-theme") as ResolvedTheme | null) ?? "light",
  );

  const applyTheme = useCallback((next: ResolvedTheme) => {
    document.documentElement.setAttribute("data-theme", next);
    setResolvedTheme(next);
  }, []);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      localStorage.setItem(STORAGE_KEY, next);
      const prefersDark = window.matchMedia(MEDIA_QUERY).matches;
      applyTheme(resolveTheme(next === "system" ? null : next, prefersDark));
    },
    [applyTheme],
  );

  // Live-follow OS changes only while in "system" mode.
  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia(MEDIA_QUERY);
    const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [mode, applyTheme]);

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

- [ ] **Step 2: Manual verification**

```bash
cd frontend && npx tsc -b
```

Expected: no type errors (this file isn't wired into the app yet, but must type-check standalone). If `tsc -b` reports errors in unrelated files from before this change, confirm they pre-existed via `git stash && npx tsc -b` — only new errors from this file are this task's concern.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/theme/ThemeContext.tsx
git commit -m "feat(theme): add ThemeContext with tri-state mode + system-follow

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: `antdTheme.ts` — light/dark Ant Design token maps

**Files:**
- Create: `frontend/src/design-system/antdTheme.ts`

**Interfaces:**
- Produces: `export function getAntdThemeConfig(resolvedTheme: "light" | "dark"): ThemeConfig` (antd's `ThemeConfig` type, from `"antd"`).
- Consumes: nothing from other tasks. Consumed by Task 5 (`main.tsx`).

- [ ] **Step 1: Create the file**

```ts
import { theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";

const SHARED_TOKEN = {
  colorPrimary: "#4338CA",
  borderRadius: 6,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', Roboto, Helvetica, Arial, sans-serif",
};

// Mirrors the semantic tokens in frontend/src/design-system/tokens.css.
// Keep these two objects in sync by hand if those change — antd's theme
// algorithm needs literal color values to derive hover/active shades, it
// can't consume var(--...) references.
const LIGHT_TOKEN = {
  ...SHARED_TOKEN,
  colorBgContainer: "#fbfbfd",
  colorBgLayout: "#f4f5f8",
  colorBorder: "#dcdee6",
  colorBorderSecondary: "#eaebf1",
  colorText: "#14161c",
  colorTextSecondary: "#5b6072",
};

const DARK_TOKEN = {
  ...SHARED_TOKEN,
  colorBgContainer: "#14161c",
  colorBgLayout: "#1b1e26",
  colorBorder: "#343948",
  colorBorderSecondary: "#242833",
  colorText: "#f7f8fa",
  colorTextSecondary: "#b8bdce",
};

export function getAntdThemeConfig(resolvedTheme: "light" | "dark"): ThemeConfig {
  return {
    algorithm: resolvedTheme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: resolvedTheme === "dark" ? DARK_TOKEN : LIGHT_TOKEN,
  };
}
```

- [ ] **Step 2: Manual verification**

```bash
cd frontend && npx tsc -b
```

Expected: no new type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/design-system/antdTheme.ts
git commit -m "feat(theme): add antd ThemeConfig maps for light/dark

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Wire `ThemeProvider` + `ConfigProvider` in `main.tsx`

**Files:**
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Consumes: `ThemeProvider`, `useTheme` (Task 3); `getAntdThemeConfig` (Task 4).

- [ ] **Step 1: Split `Root` into an outer provider wrapper and an inner shell that reads theme**

```diff
 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { App as AntApp, ConfigProvider } from "antd";
 import enUS from "antd/locale/en_US";
 import zhTW from "antd/locale/zh_TW";
 import { StrictMode } from "react";
 import { createRoot } from "react-dom/client";
 import { useTranslation } from "react-i18next";
 import { BrowserRouter } from "react-router-dom";
 import App from "./App.tsx";
 import { AuthProvider } from "./auth/AuthContext";
+import { getAntdThemeConfig } from "./design-system/antdTheme";
+import { ThemeProvider, useTheme } from "./theme/ThemeContext";
 import "./i18n";
 import "./global.css";
 import "./design-system/tokens.css";
 import "./design-system/components.css";

 const queryClient = new QueryClient({
   defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
 });

 // Keeps antd's own strings (Table pagination, Empty, default Modal/Popconfirm
 // button text, …) in sync with the language picked via the LanguageSwitcher —
 // otherwise those fall back to antd's English defaults regardless of what the
 // rest of the app is showing.
-function Root() {
+function AppShell() {
   const { i18n } = useTranslation();
+  const { resolvedTheme } = useTheme();

   return (
     <ConfigProvider
       locale={i18n.language.startsWith("en") ? enUS : zhTW}
-      theme={{
-        token: {
-          colorPrimary: "#4338CA",
-          borderRadius: 6,
-          fontFamily:
-            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', Roboto, Helvetica, Arial, sans-serif",
-        },
-      }}
+      theme={getAntdThemeConfig(resolvedTheme)}
     >
       <AntApp>
         <QueryClientProvider client={queryClient}>
           <BrowserRouter>
             <AuthProvider>
               <App />
             </AuthProvider>
           </BrowserRouter>
         </QueryClientProvider>
       </AntApp>
     </ConfigProvider>
   );
 }

+function Root() {
+  return (
+    <ThemeProvider>
+      <AppShell />
+    </ThemeProvider>
+  );
+}
+
 createRoot(document.getElementById("root")!).render(
   <StrictMode>
     <Root />
   </StrictMode>,
 );
```

- [ ] **Step 2: Manual verification**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`, log in, confirm the app renders identically to before this change (light mode, indigo primary color, no console errors). Then in devtools console:

```js
document.documentElement.setAttribute("data-theme", "dark");
```

The `data-theme` attribute flips, but the UI does **not** yet visually change — `ThemeContext`'s React state hasn't been told to change (only `ThemeToggle`, built in Task 6, drives that through `setMode`). This step only confirms the app still boots correctly with the provider wiring in place.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat(theme): wire ThemeProvider and theme-aware antd ConfigProvider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: `ThemeToggle` component + i18n keys

**Files:**
- Create: `frontend/src/components/ThemeToggle.tsx`
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/i18n/locales/zh.json`

**Interfaces:**
- Consumes: `useTheme`, `ThemeMode` (Task 3).
- Produces: `export function ThemeToggle(): JSX.Element` — consumed by Task 7 (`AppLayout.tsx`).

- [ ] **Step 1: Add i18n keys**

In `frontend/src/i18n/locales/en.json`, inside the `"nav"` object, right after `"language": "Language",`:

```diff
       "language": "Language",
       "languageZh": "中文",
       "languageEn": "English"
+      ,
+      "theme": "Theme",
+      "themeLight": "Light",
+      "themeDark": "Dark",
+      "themeSystem": "System"
```

(Apply as valid JSON — i.e. add a trailing comma after `"languageEn": "English"` and the four new keys before the closing `}` of `"nav"`.)

In `frontend/src/i18n/locales/zh.json`, same position:

```diff
       "language": "語言",
       "languageZh": "中文",
       "languageEn": "English"
+      ,
+      "theme": "主題",
+      "themeLight": "淺色",
+      "themeDark": "深色",
+      "themeSystem": "跟隨系統"
```

- [ ] **Step 2: Create `ThemeToggle.tsx`**

```tsx
import { Segmented } from "antd";
import { Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ThemeMode } from "../theme/ThemeContext";
import { useTheme } from "../theme/ThemeContext";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();

  const options: { value: ThemeMode; icon: ReactNode; title: string }[] = [
    { value: "light", icon: <Sun size={14} />, title: t("nav.themeLight") },
    { value: "dark", icon: <Moon size={14} />, title: t("nav.themeDark") },
    { value: "system", icon: <Monitor size={14} />, title: t("nav.themeSystem") },
  ];

  return (
    <Segmented
      aria-label={t("nav.theme")}
      value={mode}
      onChange={(value) => setMode(value as ThemeMode)}
      options={options.map(({ value, icon, title }) => ({
        value,
        label: (
          <span title={title} aria-label={title}>
            {icon}
          </span>
        ),
      }))}
    />
  );
}
```

- [ ] **Step 3: Manual verification**

```bash
cd frontend && npx tsc -b
```

Expected: no new type errors. (The component isn't mounted anywhere yet — Task 7 does that — so this only confirms it compiles.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ThemeToggle.tsx frontend/src/i18n/locales/en.json frontend/src/i18n/locales/zh.json
git commit -m "feat(theme): add ThemeToggle tri-state segmented control

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Migrate `AppLayout.tsx` + mount `ThemeToggle`

**Files:**
- Modify: `frontend/src/components/AppLayout.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` (Task 6).

- [ ] **Step 1: Replace hardcoded hex with tokens**

```diff
-        <Sider width={224} theme="light" style={{ borderRight: "1px solid #E4E6EC" }}>
+        <Sider width={224} theme="light" style={{ borderRight: "1px solid var(--border-default)" }}>
```

```diff
         <Header
           style={{
-            background: "#fff",
-            borderBottom: "1px solid #E4E6EC",
+            background: "var(--bg-surface)",
+            borderBottom: "1px solid var(--border-default)",
             padding: "0 16px 0 24px",
```

```diff
           <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
+            <ThemeToggle />
             <LanguageSwitcher />
```

```diff
-                <Avatar size={26} style={{ background: "#EEF0FE", color: "#4338CA" }}>
+                <Avatar size={26} style={{ background: "var(--color-brand-tint)", color: "var(--fg-on-brand-tint)" }}>
```

```diff
-                <DownOutlined style={{ fontSize: 11, color: "#9AA0AC" }} />
+                <DownOutlined style={{ fontSize: 11, color: "var(--fg-subtle)" }} />
```

Also find the `Brand` component earlier in the same file (the logo mark using `background: "#4338CA"` and `color: "#fff"` around line 53-54) and update:

```diff
-          background: "#4338CA",
-          color: "#fff",
+          background: "var(--color-brand)",
+          color: "var(--fg-on-brand)",
```

- [ ] **Step 2: Add the import**

```diff
 import { useAuth } from "../auth/AuthContext";
 import type { SupportedLanguage } from "../i18n";
+import { ThemeToggle } from "./ThemeToggle";
```

- [ ] **Step 3: Manual verification**

```bash
cd frontend && npm run dev
```

1. Open `http://localhost:5173`, log in. The `Segmented` toggle appears in the header, left of the language switcher, defaulting to whatever your OS theme resolves to (System is selected by default on first visit).
2. Click each of the three options. Sidebar, header, avatar tint, brand mark, and the app's general background must all switch between light/dark **immediately**, with no reload.
3. Reload the page after picking "Dark" — page must load already-dark, no flash.
4. Resize to mobile width (drawer mode) — toggle is still visible and functional in the header.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/AppLayout.tsx
git commit -m "feat(theme): migrate AppLayout to design tokens, mount ThemeToggle

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Migrate `AgentsTable.tsx`

**Files:**
- Modify: `frontend/src/components/AgentsTable.tsx`

- [ ] **Step 1: Replace hardcoded hex with tokens**

```diff
-              <div style={{ color: "#9AA0AC", fontSize: 12 }}>{record.slug}</div>
+              <div style={{ color: "var(--fg-subtle)", fontSize: 12 }}>{record.slug}</div>
```

```diff
-      style={{ background: "#fff" }}
+      style={{ background: "var(--bg-surface)" }}
```

```diff
-    <Avatar size={22} style={{ background: "#EEF0FE", color: "#4338CA", fontSize: 10 }}>
+    <Avatar size={22} style={{ background: "var(--color-brand-tint)", color: "var(--fg-on-brand-tint)", fontSize: 10 }}>
```

- [ ] **Step 2: Manual verification**

```bash
cd frontend && npm run dev
```

Navigate to `/` (Browse) and `/my-agents`, toggle theme to Dark. Table background, slug text, and avatar-initial tint must all read correctly against the dark surface (slug text legible, avatar tint not washed out).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AgentsTable.tsx
git commit -m "feat(theme): migrate AgentsTable to design tokens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Migrate status tags in `tags.tsx` to `.badge-*` classes

**Files:**
- Modify: `frontend/src/components/tags.tsx`

**Interfaces:**
- Consumes: `.badge`, `.badge-pending`, `.badge-success`, `.badge-success-solid`, `.badge-danger`, `.badge-neutral`, `.badge-visibility-public/internal/private` (already defined in `frontend/src/design-system/components.css`, unchanged by this plan).
- Produces: same exported component names/props as before (`VersionStatusTag`, `VisibilityTag`, `UserStatusTag`, `ReviewResultTag`) — call sites elsewhere in the app are unaffected.

- [ ] **Step 1: Replace the four status-bearing components' rendering**

```diff
 import { Tag } from "antd";
 import type {
   AgentVisibility,
   AssetRole,
   ReviewResult,
   UserRole,
   UserStatus,
   VersionStatus,
 } from "../api/types";

-const versionStatusConfig: Record<VersionStatus, { color: string; label: string }> = {
-  draft: { color: "default", label: "draft" },
-  submitted: { color: "processing", label: "submitted" },
-  in_review: { color: "processing", label: "in_review" },
-  approved: { color: "success", label: "approved" },
-  rejected: { color: "error", label: "rejected" },
-  active: { color: "success", label: "active" },
-  archived: { color: "default", label: "archived" },
-};
-
-export function VersionStatusTag({ status }: { status: VersionStatus }) {
-  const cfg = versionStatusConfig[status];
-  const solid = status === "active";
-  return (
-    <Tag color={cfg.color} variant={solid ? "filled" : undefined}>
-      {cfg.label}
-    </Tag>
-  );
-}
+const versionStatusClass: Record<VersionStatus, string> = {
+  draft: "badge badge-neutral",
+  submitted: "badge badge-pending",
+  in_review: "badge badge-pending",
+  approved: "badge badge-success",
+  rejected: "badge badge-danger",
+  active: "badge badge-success-solid",
+  archived: "badge badge-neutral",
+};
+
+export function VersionStatusTag({ status }: { status: VersionStatus }) {
+  return <span className={versionStatusClass[status]}>{status}</span>;
+}

 const visibilityLabel: Record<AgentVisibility, string> = {
   private: "private",
   internal: "internal",
   public: "public",
 };

-export function VisibilityTag({ visibility }: { visibility: AgentVisibility }) {
-  return (
-    <Tag color={visibility === "public" ? "blue" : "default"}>
-      {visibilityLabel[visibility]}
-    </Tag>
-  );
-}
+const visibilityClass: Record<AgentVisibility, string> = {
+  public: "badge badge-visibility-public",
+  internal: "badge badge-visibility-internal",
+  private: "badge badge-visibility-internal badge-visibility-private",
+};
+
+export function VisibilityTag({ visibility }: { visibility: AgentVisibility }) {
+  return <span className={visibilityClass[visibility]}>{visibilityLabel[visibility]}</span>;
+}

 export function AssetRoleTag({ role }: { role: AssetRole }) {
   return <Tag color={role === "owner" ? "blue" : "default"}>{role}</Tag>;
 }

 const userRoleColor: Record<UserRole, string> = {
   admin: "blue",
   reviewer: "cyan",
   member: "default",
 };

 export function UserRoleTag({ role }: { role: UserRole }) {
   return <Tag color={userRoleColor[role]}>{role}</Tag>;
 }

-export function UserStatusTag({ status }: { status: UserStatus }) {
-  return <Tag color={status === "active" ? "success" : "error"}>{status}</Tag>;
-}
+export function UserStatusTag({ status }: { status: UserStatus }) {
+  return (
+    <span className={status === "active" ? "badge badge-success" : "badge badge-danger"}>
+      {status}
+    </span>
+  );
+}

-const reviewResultColor: Record<ReviewResult, string> = {
-  pending: "default",
-  approved: "success",
-  rejected: "error",
-};
-
-export function ReviewResultTag({ result }: { result: ReviewResult }) {
-  return <Tag color={reviewResultColor[result]}>{result}</Tag>;
-}
+const reviewResultClass: Record<ReviewResult, string> = {
+  pending: "badge badge-pending",
+  approved: "badge badge-success",
+  rejected: "badge badge-danger",
+};
+
+export function ReviewResultTag({ result }: { result: ReviewResult }) {
+  return <span className={reviewResultClass[result]}>{result}</span>;
+}
```

`Tag` from `"antd"` stays imported (still used by `AssetRoleTag`/`UserRoleTag`, deliberately left on antd presets — see the File Structure section's scope note above).

- [ ] **Step 2: Manual verification**

```bash
cd frontend && npm run dev
```

Visit a page rendering each tag (`VersionDetail` for `VersionStatusTag`, `AgentDetail`/`Browse` for `VisibilityTag`, `AdminUsers` for `UserStatusTag`, `Reviews`/`ReviewDetail` for `ReviewResultTag`). Toggle to Dark:

1. Every status pill's text stays clearly legible against the page/table background (this is the pill readability the whole task was about — sanity-check by eye, the actual numbers were already validated in the spec).
2. `active` version status renders as a solid green fill with white text (not outlined) — confirms `.badge-success-solid` picked up the corrected `--status-success-solid-bg`.
3. `AssetRoleTag`/`UserRoleTag` (still antd `Tag`) also look correct in dark mode (antd's own dark algorithm from Task 5 handles these).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tags.tsx
git commit -m "feat(theme): move status tags to token-driven .badge classes

VersionStatusTag/VisibilityTag/UserStatusTag/ReviewResultTag now
render via components.css's .badge-* classes (backed by --status-*
tokens, WCAG AA-validated in both themes) instead of antd Tag preset
colors. AssetRoleTag/UserRoleTag stay on antd presets — no status
token models 'role'.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Migrate `Login.tsx`

**Files:**
- Modify: `frontend/src/pages/Login.tsx`

- [ ] **Step 1: Replace hardcoded hex with tokens**

```diff
-          "radial-gradient(600px 400px at 15% 10%, #EEF0FE, transparent 60%), #F6F7FA",
+          "radial-gradient(600px 400px at 15% 10%, var(--color-brand-tint), transparent 60%), var(--bg-surface-2)",
```

```diff
-          background: "#fff",
-          border: "1px solid #E4E6EC",
+          background: "var(--card-bg)",
+          border: "1px solid var(--card-border)",
```

```diff
-              background: "#4338CA",
-              color: "#fff",
+              background: "var(--color-brand)",
+              color: "var(--fg-on-brand)",
```

```diff
-            <div style={{ fontSize: 12, color: "#9AA0AC" }}>{t("login.subtitle")}</div>
+            <div style={{ fontSize: 12, color: "var(--fg-subtle)" }}>{t("login.subtitle")}</div>
```

```diff
-          <Divider plain style={{ fontSize: 12, color: "#9AA0AC" }}>
+          <Divider plain style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
```

- [ ] **Step 2: Manual verification**

```bash
cd frontend && npm run dev
```

Log out (or open `/login` directly), toggle theme to Dark before the login card is submitted (theme preference persists across the auth boundary since it's `localStorage`, not tied to the authenticated session). Confirm: background gradient, card, brand mark, subtitle, and divider text all render correctly on dark.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Login.tsx
git commit -m "feat(theme): migrate Login page to design tokens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Migrate `AgentDetail.tsx`

**Files:**
- Modify: `frontend/src/pages/AgentDetail.tsx`

- [ ] **Step 1: Replace hardcoded hex with tokens**

```diff
-            <span style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 500, color: "#9AA0AC" }}>
+            <span style={{ fontFamily: "monospace", fontSize: 12.5, fontWeight: 500, color: "var(--fg-subtle)" }}>
```

```diff
-          <div style={{ display: "flex", gap: 20, fontSize: 12.5, color: "#9AA0AC" }}>
+          <div style={{ display: "flex", gap: 20, fontSize: 12.5, color: "var(--fg-subtle)" }}>
```

```diff
-                {t("agentDetail.providerLabel")}<b style={{ color: "#6B7280" }}>{agent.provider}</b>
+                {t("agentDetail.providerLabel")}<b style={{ color: "var(--fg-muted)" }}>{agent.provider}</b>
```

```diff
-              {t("agentDetail.createdAtLabel")}<b style={{ color: "#6B7280" }}>{formatDate(agent.created_at)}</b>
+              {t("agentDetail.createdAtLabel")}<b style={{ color: "var(--fg-muted)" }}>{formatDate(agent.created_at)}</b>
```

```diff
-        <div style={{ background: "#fff", border: "1px solid #E4E6EC", borderRadius: 8 }}>
+        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 8 }}>
```

```diff
-                borderBottom: idx === membersQuery.data.length - 1 ? "none" : "1px solid #E4E6EC",
+                borderBottom: idx === membersQuery.data.length - 1 ? "none" : "1px solid var(--border-default)",
```

```diff
-                <Avatar size={22} style={{ background: "#EEF0FE", color: "#4338CA", fontSize: 10 }}>
+                <Avatar size={22} style={{ background: "var(--color-brand-tint)", color: "var(--fg-on-brand-tint)", fontSize: 10 }}>
```

```diff
-                <span style={{ fontSize: 12.5, fontFamily: "monospace", color: "#6B7280" }}>{m.user_id}</span>
+                <span style={{ fontSize: 12.5, fontFamily: "monospace", color: "var(--fg-muted)" }}>{m.user_id}</span>
```

- [ ] **Step 2: Manual verification**

```bash
cd frontend && npm run dev
```

Open any agent detail page (`/agents/:slug`), toggle Dark. Confirm the slug/provider/created-at labels, the members card, member row dividers, and member avatars all render correctly.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AgentDetail.tsx
git commit -m "feat(theme): migrate AgentDetail page to design tokens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: Migrate `VersionDetail.tsx`

**Files:**
- Modify: `frontend/src/pages/VersionDetail.tsx`

- [ ] **Step 1: Replace hardcoded hex with tokens**

```diff
-          <div style={{ fontSize: 12.5, color: "#9AA0AC" }}>
+          <div style={{ fontSize: 12.5, color: "var(--fg-subtle)" }}>
```

```diff
-          <div style={{ background: "#fff", border: "1px solid #E4E6EC", borderRadius: 8, padding: 20, marginBottom: 18 }}>
+          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 8, padding: 20, marginBottom: 18 }}>
```

```diff
-                <div style={{ fontSize: 11.5, fontWeight: 600, color: "#9AA0AC", marginBottom: 6 }}>
+                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-subtle)", marginBottom: 6 }}>
```

(applies to both occurrences of that exact line — lines 290 and 300)

```diff
-          <div style={{ background: "#fff", border: "1px solid #E4E6EC", borderRadius: 8, padding: 20 }}>
+          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 8, padding: 20 }}>
```

(applies to both occurrences — lines 317 and 358)

```diff
-                    <div style={{ fontSize: 12.5, fontFamily: "monospace", color: "#6B7280" }}>
+                    <div style={{ fontSize: 12.5, fontFamily: "monospace", color: "var(--fg-muted)" }}>
```

- [ ] **Step 2: Manual verification**

```bash
cd frontend && npm run dev
```

Open a version detail page (`/agents/:agentSlug/versions/:versionSlug`), toggle Dark. Confirm all three card sections and the monospace metadata text render correctly.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/VersionDetail.tsx
git commit -m "feat(theme): migrate VersionDetail page to design tokens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Migrate `Skills.tsx` and `ReviewDetail.tsx`

**Files:**
- Modify: `frontend/src/pages/Skills.tsx`
- Modify: `frontend/src/pages/ReviewDetail.tsx`

- [ ] **Step 1: `Skills.tsx` — replace both occurrences**

```diff
-                          <div style={{ color: "#9AA0AC", fontSize: 12 }}>v{r.version}</div>
+                          <div style={{ color: "var(--fg-subtle)", fontSize: 12 }}>v{r.version}</div>
```

(lines 90 and 125 — identical, apply to both)

- [ ] **Step 2: `ReviewDetail.tsx`**

```diff
-            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#9AA0AC", marginBottom: 8 }}>
+            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-subtle)", marginBottom: 8 }}>
```

- [ ] **Step 3: Manual verification**

```bash
cd frontend && npm run dev
```

Open `/skills` and a `/reviews/:reviewId` detail page, toggle Dark. Confirm the version labels (Skills) and the field label (ReviewDetail) render correctly.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Skills.tsx frontend/src/pages/ReviewDetail.tsx
git commit -m "feat(theme): migrate Skills and ReviewDetail pages to design tokens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: Migrate `RegistryMcps.tsx`, `RegistryModels.tsx`, `RegistrySkills.tsx`

**Files:**
- Modify: `frontend/src/pages/RegistryMcps.tsx`
- Modify: `frontend/src/pages/RegistryModels.tsx`
- Modify: `frontend/src/pages/RegistrySkills.tsx`

These three files share the same sync-status-banner shape (per `UI_AUDIT.md`: "near-identical shape... mirrors AdminMcpRegistryPage.tsx"). Apply the same diff to each.

- [ ] **Step 1: Apply to `RegistryMcps.tsx`**

```diff
-          background: "#F7F8FA",
-          border: "1px solid #E4E6EC",
+          background: "var(--bg-surface-2)",
+          border: "1px solid var(--border-default)",
```

```diff
-        <span style={{ color: "#5B6270" }}>
+        <span style={{ color: "var(--fg-muted)" }}>
```

```diff
-                <div style={{ color: "#9AA0AC", fontSize: 12 }}>v{r.version}</div>
+                <div style={{ color: "var(--fg-subtle)", fontSize: 12 }}>v{r.version}</div>
```

- [ ] **Step 2: Apply the identical diff to `RegistryModels.tsx`**

Same three replacements (note this file's third line also carries `fontFamily: "monospace"` alongside — keep that untouched, only swap the color value):

```diff
-          background: "#F7F8FA",
-          border: "1px solid #E4E6EC",
+          background: "var(--bg-surface-2)",
+          border: "1px solid var(--border-default)",
```

```diff
-        <span style={{ color: "#5B6270" }}>
+        <span style={{ color: "var(--fg-muted)" }}>
```

```diff
-                <div style={{ color: "#9AA0AC", fontSize: 12, fontFamily: "monospace" }}>
+                <div style={{ color: "var(--fg-subtle)", fontSize: 12, fontFamily: "monospace" }}>
```

- [ ] **Step 3: Apply the identical diff to `RegistrySkills.tsx`**

```diff
-          background: "#F7F8FA",
-          border: "1px solid #E4E6EC",
+          background: "var(--bg-surface-2)",
+          border: "1px solid var(--border-default)",
```

```diff
-        <span style={{ color: "#5B6270" }}>
+        <span style={{ color: "var(--fg-muted)" }}>
```

```diff
-                <div style={{ color: "#9AA0AC", fontSize: 12 }}>v{r.version}</div>
+                <div style={{ color: "var(--fg-subtle)", fontSize: 12 }}>v{r.version}</div>
```

- [ ] **Step 4: Manual verification**

```bash
cd frontend && npm run dev
```

Open `/registry/mcps`, `/registry/models`, `/registry/skills` (admin account required), toggle Dark. Confirm the sync-status banner and version labels render correctly on all three.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/RegistryMcps.tsx frontend/src/pages/RegistryModels.tsx frontend/src/pages/RegistrySkills.tsx
git commit -m "feat(theme): migrate Registry mirror pages to design tokens

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 15: Full app manual QA pass

**Files:** none (verification-only task).

- [ ] **Step 1: Run the app**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Run through the spec's acceptance checklist**

1. Toggle Light → Dark → System, on every page in the file structure table above. No leftover white/light patch on any of them.
2. With mode = System, change the OS theme while the app is open (no reload) — page updates live.
3. Set mode = Dark, hard-reload (Cmd/Ctrl+Shift+R) — page paints dark from the first frame, zero flash of light.
4. Set mode = Light explicitly, then change OS to dark — page stays light (manual choice overrides system, as designed).
5. Open devtools → Application → Local Storage — confirm key `theme` holds exactly `"light"`, `"dark"`, or `"system"` matching the current UI selection.
6. Spot-check with devtools' built-in contrast checker (inspect element → Styles → color swatch → contrast ratio) on: a `.badge-danger` pill, a `.badge-success-solid` pill, and body text on a card, in Dark mode. Ratios should match Task 1's corrected values (≥4.5:1).
7. Resize to mobile width and repeat step 1 for the drawer nav.

- [ ] **Step 3: Fix any regression found, re-run step 2's relevant check, then commit the fix**

(No pre-written diff here — this step exists to close out whatever step 2 actually finds. If nothing is found, skip straight to Step 4.)

- [ ] **Step 4: Final commit marking the feature complete**

```bash
git add -A
git commit -m "chore(theme): dark/light toggle QA pass complete

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" --allow-empty
```
