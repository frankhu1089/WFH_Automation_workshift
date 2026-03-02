# Stage 3 SPEC — 多人可用（SaaS/團隊工具）

## 1. 產品形態
- Web App + 後端 API + DB（multi-tenant）
- 每個使用者：
  - 設定自己的代號與門診規則
  - 授權自己的 Google Calendar
- 班表來源：
  - 使用者自己上傳（最穩）
  - 管理者上傳一次，全員共用（依代號分流）
  - 進階：Gmail API / 轉寄信箱自動抓附件

---

## 2. 資料模型（概念）
### 2.1 User
- id
- email
- rosterCode
- timezone
- calendarId
- googleOAuthTokens (encrypted)
- createdAt/updatedAt

### 2.2 ClinicRule
- userId
- weekday (1=Mon ... 7=Sun)
- slot (morning/afternoon)
- title = 固定門診
- location
- enabled

### 2.3 RosterFile
- id
- month (YYYY-MM)
- uploadedByUserId
- storageUrl
- parserVersion
- createdAt

### 2.4 SyncRun
- id
- userId
- month
- rosterFileId
- status (success/failed)
- created/updated/deleted counts
- report json
- createdAt

---

## 3. API 設計（示例）
- POST `/api/upload-roster` → 上傳 xlsx，回傳 rosterFileId + parse preview
- POST `/api/parse` → 指定 rosterFileId + code + month → ParsedEvent[]
- POST `/api/sync` → 指定 month → 實際同步 Google Calendar（會讀 user 設定與 token）
- GET `/api/sync-runs?month=YYYY-MM` → 同步歷史

---

## 4. 班表共用模式（推薦）
### 4.1 管理者上傳一次（全員共用）
- Admin 上傳該月上/下半月 → 系統合併成「RosterFile（月）」
- 各使用者只要按「同步」即可取得屬於自己的事件（依 rosterCode 解析）

優點：
- 不用每人都上傳一次
- 解析基準一致

---

## 5. 自動化（可選）
### 5.1 排程同步
- 每月固定日（例如 25 號）提醒「上傳/同步」
- 或檢測到新 rosterFile 後，自動對所有 user 跑同步（背景 job）

### 5.2 Gmail Ingestion（進階）
- 讓使用者授權 Gmail read-only，指定 label（例如 `wmfm_roster`）
- 系統定期掃描最新附件 → 產生 rosterFile → 觸發同步

---

## 6. 安全與權限
- 每位使用者只能操作自己 token、自己的 calendarId
- 同步僅操作 description 含：
  - `#wmfm-schedule #code-<user.rosterCode> #YYYY-MM`

---

## 7. 佈署建議
- Frontend: Next.js (Vercel)
- Backend: Next.js API routes 或獨立 Node service
- DB: Postgres (Supabase/Neon)
- Jobs: Cloud scheduler + queue（或 BullMQ）
- Storage: S3 compatible
