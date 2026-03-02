# Parser SPEC（v1）— 202603 上/下半月 V3 班表解析規格

> 目標：從 1~2 份 xlsx 中，解析出「指定代號」在該月份的事件清單（上午/下午/週末班），並忽略晚上 OPD 與統計。

---

## 1. 輸入/輸出

### 1.1 輸入
- xlsx 檔案（可能 1 份或 2 份）
- 指定代號：例如 `中`
- 時間模板：
  - morning: 08:00–12:00
  - afternoon: 13:30–17:30
  - weekend: 08:00–12:00
- 固定門診規則（週一/週三）

### 1.2 輸出
- `ParsedEvent[]`（詳見 event schema）
- `ParseDiagnostics`（解析診斷：區塊找到與否、警告、錯誤）

---

## 2. 區塊辨識策略（不要硬寫死 row/col）

### 2.1 Sheet 遍歷
- 對每個 worksheet：
  1. 讀取整張表的 `cell.value` 形成 2D grid（保留 row/col index）
  2. 尋找關鍵字 anchor：
     - `日期`（上午/下午主表的日期列）
     - `下午` 或 `下午OPD`（下午區塊起點）
     - `週末班`（週末班表起點）
     - `晚上`（晚上OPD，僅用來判斷區塊邊界，最終忽略）
     - `統計`（統計區塊，忽略）

### 2.2 主表（上午/下午）探測
**Anchor：** 出現 `日期` 的那一列（可能是合併儲存格，但 SheetJS 會展開為多格空值；要以文字出現位置為準）

推定規則：
- 日期列 = 包含文字 `日期` 的 row
- 日期欄 = 日期列中，從某一個 col 開始，每個 col 可能是一個日期（例如 3/16, 3/17…）
- 對日期列後面的各列：第一欄通常是「列名/任務」（例如 OPD、理學、總評…）
- 上午區塊 rows：從日期列+1 開始，直到遇到含 `下午` 的 row 之前
- 下午區塊 rows：從含 `下午` 的 row 之後（或該 row 本身以下）開始，直到遇到 `晚上` 或 `週末班` 或 `統計` 之前

**注意：**
- 若同一張 sheet 同時包含上午與下午，使用上述邊界切割。
- 若上半月/下半月分別在不同檔案，兩個檔都跑同樣流程，最後合併事件。

---

## 3. 日期解析

### 3.1 日期欄位的值來源
日期列中的每個日期 cell 可能是：
- Excel Date（number + format）
- 字串（例如 `3/16`、`3/16(一)`）

### 3.2 年月推定
- 優先從檔名推定：例如 `202603上半月V3.xlsx` → year=2026, month=03
- 若檔名無法解析，則在 sheet 中尋找 `2026` 或 `2026/3` 之類字樣
- 若仍失敗：要求使用者在 UI 選擇 year-month（Stage 1 最後備援）

### 3.3 轉換到日期（YYYY-MM-DD）
- 對於 `3/16` → 組合成 `2026-03-16`
- 對於 Excel serial date → 直接轉換（注意時區、不要加 1 天錯誤）

---

## 4. 代號命中規則（Token match）

### 4.1 支援的分隔符
- `/ : 、 , 空白 \\n \\t` 以及全形/半形變體

### 4.2 Tokenize
- `rawText` → normalize：
  - 全形標點轉半形（可選）
  - 連續空白壓成一個空白
- 以分隔符切 token：`tokens = split(rawText, /[\\s\\/,:，、]+/)`
- 命中條件：`tokens` 中任一 token **完全等於** 代號（例如 `中`）

### 4.3 例外與強化
- `深坑:中` → tokens `["深坑","中"]` 命中
- `佳鴻:中` → 命中（仍算你的業務）
- 若 rawText 包含括號註記，仍 tokenize

---

## 5. 事件生成（上午/下午主表）

對於每個主表列（row）：
- `taskLabel = firstCellText(row)`（該列第一欄的列名；例如 `OPD`、`2線總評`…）
- 對於每個日期欄（col）：
  - `cellText = value(row,col)`
  - 若 `matchCode(cellText, code)`：
    - `date = parseDate(headerRow,col)`
    - `slot = "morning" | "afternoon"`（依區塊）
    - 建立 `ParsedEvent`：
      - title：`家醫-{上午/下午}-{taskLabel}`
      - start/end：依 slot 套用時間模板
      - source：檔名+sheet+cellAddress
      - raw：cellText
      - tags：`#wmfm-schedule #code-{code} #YYYY-MM`
      - dedupeKey：`sha1(YYYY-MM-DD + slot + taskLabel + code + locationHint)`
    - 若該 cell 同時包含多代號（如 `清/徐/宇/中`），仍只為「中」建事件（不拆出其他人）

---

## 6. 週末班表解析

### 6.1 Anchor
- 找到含 `週末班` 的 row 之後，往下掃描直到空行或 `統計`。

### 6.2 日期列
- 週末班的每一列第一欄通常是日期字串，例如 `2026/3/28(六)`
- parse 出 `YYYY-MM-DD`

### 6.3 欄位與列名
- 同一列其他欄可能代表不同區段（例如 2F/13F/其他）
- v1 做法：
  - `taskLabel = "週末班"`（主標籤）
  - `subLabel = headerTextOfColumn(col)`（若上方有欄名）或 `colLetter`
  - title：`家醫-週末-週末班{可選 subLabel}`
- 若任一欄 cell 命中代號 → 建事件（slot=weekend）

---

## 7. 固定門診事件生成

### 7.1 規則
- 週一、週三固定門診
- v1（Stage 1）：展平成當月所有週一/週三的事件（非 recurring）
- v2（Stage 2）：用 RRULE 建 recurring（更乾淨）

### 7.2 事件內容
- title：`家醫-固定門診`
- description：包含 tags
- slot：使用者設定上午或下午（或兩者都可）

---

## 8. 衝突偵測（診斷）

### 8.1 定義
同一天同時段（morning/afternoon/weekend）出現 >1 事件

### 8.2 行為
- 仍輸出全部事件
- 在 event.description 加上：
  - `⚠️CONFLICT: {n} events in same slot`
- 在 diagnostics 中回報

---

## 9. 錯誤處理
- 找不到 `日期` row → `ERROR: NO_DATE_HEADER`
- 找不到任何可解析日期 → `ERROR: NO_PARSABLE_DATES`
- 檔名無法推年/月且 sheet 也找不到 → `WARN: NEED_USER_MONTH`
- 週末班日期 parse 失敗 → 跳過該列並回報 `WARN`

---

## 10. 測試案例（建議）
- Case 1：cellText = `清/徐/宇/中` → 命中
- Case 2：cellText = `深坑:中` → 命中
- Case 3：cellText = `中心` → 不命中（token 不是 `中`）
- Case 4：同一天上午兩個不同列都命中 → conflict
