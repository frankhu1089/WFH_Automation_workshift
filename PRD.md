# 萬芳家醫班表同步器（WMFM Schedule Sync）— PRD（Stage 1~3）

## 0. 產品一句話
把「確認版班表 Excel」中屬於代號「中」的當月排班，自動轉成「只屬於我」的事件清單，並以 **ICS 匯入（Stage 1）** 或 **Google Calendar API 直接同步（Stage 2）** 方式更新到 Google Calendar；並在 Stage 3 擴展成可讓其他人輸入代號/門診規則/Email 後同樣自動同步的多人版本。

---

## 1. 背景與目標

### 1.1 背景
- 班表以 Excel 提供，上半月/下半月各一份，版面包含「上午」「下午」「週末班」等區塊。
- 你只關心：代號「中」的所有排班（有排到就算） + 固定門診（週一/週三）。
- 晚上 OPD 可忽略（你保證不會有）。

### 1.2 目標（Outcomes）
- **O1：** 每月收到確認班表後，用最少步驟產生「我的班表」。
- **O2：** 可反覆同步而不重複、可更新（idempotent）。
- **O3：** 不影響你私人行事曆事件（只動帶標籤的事件）。
- **O4：** Stage 3 支援多人使用。

### 1.3 非目標（Non-goals）
- Stage 1 不做 Gmail 自動抓附件。
- Stage 1 不做 Google Calendar 直接寫入（避免 OAuth complexity）。
- 不處理晚上 OPD 區塊（永遠忽略）。

---

## 2. 目標使用者與情境（Vertical Slices）

### Slice A：你本人（代號「中」）每月同步一次（Stage 1/2）
- 你收到 email 附件（xlsx）。
- 打開網頁 → 上傳上/下半月 → 解析 → 預覽 → 下載 ICS（Stage 1）或一鍵同步 Google Calendar（Stage 2）。
- 系統同時補上固定門診（週一/週三）。

### Slice B：你本人修正/重匯入（Stage 1/2）
- 你收到「新版確認表」或班表更動。
- 重新上傳 → 解析 → 同步 → 系統只更新帶 tag 的事件，不碰其他私人事件。
- 同一個事件（同 dedupeKey）應被更新而非重複建立。

### Slice C：其他住院醫師/同事（Stage 3）
- 其他人輸入自己的代號（例如「清」「徐」「宇」…）與固定門診規則、授權自己的 Google Calendar。
- 上傳同一份班表或由系統取得班表 → 自動同步到該使用者的 Calendar。

---

## 3. Stage 規劃

## Stage 1 — MVP：上傳 xlsx → 解析 → 預覽 → 下載 ICS → 手動匯入 Google Calendar
### 3.1 功能清單
**必做（Must）**
1. 上傳 1~2 個 Excel（上半月、下半月）
2. 選擇「代號」（預設中，可改）
3. 解析出事件清單（上午/下午/週末班）
4. 事件時間模板：  
   - 上午 08:00–12:00  
   - 下午 13:30–17:30  
   - 週末 08:00–12:00
5. 固定門診：週一/週三（可切換、可設定上午/下午/地點）
6. 事件標題格式（task 直接用列名）：  
   - `家醫-上午/下午-2F理學+13樓1200` / `2線總評` / `固定門診`
7. 為所有事件加上 tags（寫入 description）：  
   - `#wmfm-schedule #code-中 #2026-03`
8. 下載 ICS 檔（單一檔案，含全月事件）

**可選（Should）**
- 解析結果預覽：表格 + 衝突提示（同一天同時段多事件）
- 允許使用者修正：同一天同時段只留一個（簡易 UI）

**不做（Won't）**
- Gmail 讀信、抓附件
- Google Calendar API 直接寫入

### 3.2 成功指標
- 從上傳到下載 ICS < 60 秒
- 匯入後事件數與預覽一致
- tags 正確存在於每個事件的描述欄位

---

## Stage 2 — 完整版：一鍵同步 Google Calendar（idempotent）
### 3.3 追加功能
1. Google OAuth 登入（只要 Calendar scope）
2. 選擇目標 Calendar（建議建立「WMFM 班表」專用 Calendar）
3. 同步策略（idempotent）：
   - 只操作 description 含 `#wmfm-schedule` 且月份 tag 相符的事件
   - 用 `dedupeKey` 判斷 create vs update
4. 支援「刪除不存在」：
   - 新班表同步後，若舊事件（同月份 tag）在新解析清單裡不存在，則刪除（或改為取消 / 標記為取消）
5. 同步紀錄與回報：
   - created / updated / deleted 數量
   - 異常（例如時間衝突、解析不確定）列表

---

## Stage 3 — 多人 SaaS：多代號、多門診、多人授權、可共用班表來源
### 3.4 追加功能（多人化）
1. 使用者帳號與設定：
   - roster_code（代號）
   - clinic_rules（固定門診規則）
   - timezone（預設 Asia/Taipei）
   - calendar_id（每人可指定）
2. 班表來源（ingestion）選項：
   - A. 使用者自行上傳（最穩）
   - B. 系統管理者上傳一次，所有人共用同一份班表（依代號分流）
   - C. Gmail API / 轉寄信箱自動抓附件（進階）
3. 權限與安全：
   - 每位使用者只操作自己 Calendar 中帶自己 tag 的事件（例如 `#code-清`）
4. 佈署與營運：
   - Multi-tenant DB（Postgres）
   - Background jobs（同步可排程、可重試）

---

## 4. 需求細節（Stage 1/2 共通）

### 4.1 輸入資料
- Excel xlsx（上半月/下半月），版面包含：
  - 上午主表（日期列在上方）
  - 下午主表
  - 週末班（文字日期列）
  - 晚上 OPD（忽略）
  - 統計（忽略）

### 4.2 代號命中規則（v1）
- 任何儲存格文字內容中，出現代號 token 即視為命中。
- 支援常見分隔符：`/`、`:`、`、`、`,`、空白、換行。
- 例如：`清/徐/宇/中`、`深坑:中`、`中`
- 避免誤判：代號必須是「token」，不能只是某字的一部分（以分隔符與邊界判斷）。

### 4.3 事件生成規則
- 上午/下午/週末班：
  - 一個命中 → 產生一個事件
- 固定門診：
  - 由使用者設定產生 recurring（Stage 2）或展平成當月每週（Stage 1）
- 若同一天同時段產生多個事件：
  - v1：全部保留，但在 description 標註 `⚠️CONFLICT`
  - v2（可選）：UI 讓使用者選擇保留哪一個

### 4.4 事件內容
- Title：`家醫-{時段}-{列名}`（列名可加上格內備註）
- Description（必含 tags）：
  - `#wmfm-schedule #code-中 #2026-03`
  - `source: 202603上半月V3.xlsx`
  - `cell: <sheet>!<A1>`
  - `raw: <原始文字>`
  - `dedupeKey: <hash>`
- Location：可留空或從列名推測（例如 2F/13F）
- Timezone：Asia/Taipei

---

## 5. 介面（Stage 1 MVP）

### 5.1 頁面
1. Home / Upload
   - 拖曳上傳（可多檔）
   - 代號輸入（預設「中」）
   - 月份選擇（或自動從檔名/日期列推）
2. Settings
   - 時間模板（上午/下午/週末）
   - 固定門診規則（週一/週三，上午或下午、地點）
3. Preview
   - 事件列表（日期、時間、標題、來源）
   - 衝突標記
4. Export
   - 下載 ICS

### 5.2 互動最小集合
- 上傳 → 解析 → 顯示 event count → 可下載
- 解析失敗時顯示可讀錯誤（哪一張 sheet、哪一區塊）

---

## 6. 技術選型（建議）
- Web：Next.js (App Router) + Tailwind
- Parsing：SheetJS `xlsx`
  - Stage 1 可全在 Browser parsing（不出網，私密）
  - Stage 2 可能需要 server-side（若要存檔、做同步記錄）
- ICS：自行輸出 RFC5545 基本欄位（或用 `ics` npm）
- Calendar（Stage 2+）：Google Calendar API + OAuth

---

## 7. 風險與對策
1. Excel 版面變動 → 解析失敗
   - 對策：parser SPEC 裡定義「探測式」尋找區塊（靠關鍵字而非硬編 row）
2. 代號 token 誤判
   - 對策：用正則邊界與分隔符；提供「命中片段高亮」預覽
3. 事件重複或刪錯
   - 對策：只動帶 `#wmfm-schedule` + 指定月份 tag 的事件；dedupeKey 穩定；提供 dry-run 預覽（Stage 2）

---

## 8. 開發里程碑（建議）
- M1：解析 + 事件清單（CLI / 單元測試）
- M2：Stage 1 Web UI + ICS 匯出
- M3：Stage 2 OAuth + Calendar 同步 + idempotent
- M4：Stage 3 使用者設定 + 多人同步 + 共用班表來源
