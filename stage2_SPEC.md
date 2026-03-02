# Stage 2 SPEC — Google Calendar 直接同步（Idempotent）

## 1. 使用者流程
1. 上傳 xlsx（同 Stage 1）
2. 解析 → 預覽（dry-run）
3. Google 登入（OAuth）
4. 選擇要同步的 Calendar（預設建立/選擇「WMFM 班表」）
5. 按「同步」→ 顯示 created/updated/deleted 統計與錯誤

---

## 2. OAuth / 權限
- Scope 建議：
  - 最小：`https://www.googleapis.com/auth/calendar.events`
  - 若要建立新 calendar：需要 `https://www.googleapis.com/auth/calendar`
- Token 保存：
  - 個人用：可只存在 session + localStorage（仍有風險）
  - 正式：server-side encrypted storage（建議）

---

## 3. 同步策略（核心：只動 tag 事件）
### 3.1 事件標記
每個同步事件 description 必須包含：
- `#wmfm-schedule`
- `#code-中`（或該使用者代號）
- `#YYYY-MM`（月份 tag，例如 `#2026-03`）
- `dedupeKey: <hash>`

### 3.2 查詢範圍（timeMin/timeMax）
- 同步月份的第一天 00:00 到次月第一天 00:00（Asia/Taipei）

### 3.3 取得現有事件（existing set）
- list events in range
- filter where description includes `#wmfm-schedule` AND `#code-中` AND `#2026-03`

### 3.4 比對與操作
- `existingByKey = Map<dedupeKey, googleEvent>`
- `newByKey = Map<dedupeKey, ParsedEvent>`

操作規則：
1. 若 key 在 new & existing → UPDATE（時間/標題/描述/地點）
2. 若 key 在 new 但不在 existing → CREATE
3. 若 key 在 existing 但不在 new → DELETE（或改成 `status=cancelled` / 在 summary 前加 `【取消】`）

### 3.5 防呆
- 任何不含 `#wmfm-schedule` 的事件 **禁止** 修改/刪除
- 若月份 tag 不符 → 禁止操作

---

## 4. Google Event 映射
- summary = ParsedEvent.title
- description = multiline：
  - tags line
  - `dedupeKey: ...`
  - `source: file/sheet/cell`
  - `raw: ...`
- start/end：用 `dateTime` + `timeZone`

---

## 5. 同步回報（Sync Report）
- `createdCount`
- `updatedCount`
- `deletedCount`
- `conflicts[]`（同日同 slot 多事件）
- `warnings[]`
- `errors[]`（含 Google API error code、哪個 key）

---

## 6. 進階（可選）
- Dry-run：只顯示會 create/update/delete，不實際寫入
- 版本標記：description 加 `parserVersion`，新版可提示「可能因版面調整而解析差異」
