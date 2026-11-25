# 週末小旅行籤：維護手冊

抽一張週末車票，決定全家這個週末去哪裡玩。這份手冊說明怎麼把網站放上網，以及之後怎麼更新景點資料。

## 資料夾裡有什麼

| 檔案 | 用途 | 多久改一次 |
|---|---|---|
| `site/places.json` | 所有景點、區域、更新紀錄 | 每次更新資料 |
| `site/index.html` | 畫面與樣式 | 很少 |
| `site/app.js` | 程式 | 很少 |
| `site/_headers` | 安全與快取設定（Cloudflare 會讀） | 幾乎不改 |
| `scripts/validate.mjs` | 上線前自動檢查資料 | 幾乎不改 |

使用者的資料（成員、旅行紀錄、星星）只存在他們自己的瀏覽器裡，你看不到，也不會上傳。

---

## 三條鐵則

1. **景點永遠不刪除，id 永遠不改。** 停業就把 `status` 改成 `"closed"`，暫停開放改成 `"paused"`，這兩種都不會被抽到。刪掉景點會讓使用者的旅行紀錄消失。
2. **區域只能加在最後面，不能改順序或刪除。**
3. **每次更新都要改 `dataVersion`，並在 `changelog` 最上面加一筆。** 使用者打開網站時，會看到「景點資料更新了」的卡片。

違反第 1、2、3 條時，自動檢查會擋下來，不會上線。

---

## 每次更新資料的步驟（在 GitHub 網頁上就能做）

1. 打開 GitHub 上的 `site/places.json`，按右上角的鉛筆圖示（Edit）。
2. 修改內容（看下面的範例）。
3. 把檔案開頭的 `dataVersion` 改成新版號，例如 `"2026.12"`。同一個月第二次更新就寫 `"2026.12.2"`。
4. 在 `changelog` 的最上面加一筆（記得在這筆的 `}` 後面加逗號）：
   ```json
   {
     "version": "2026.12",
     "date": "2026-12-20",
     "summary": "合歡山雪季管制資訊更新，新增 2 個景點。",
     "added": ["q130","q131"],
     "updated": ["q63"],
     "paused": []
   },
   ```
5. 按右上角 **Commit changes**，在說明欄寫一句這次改了什麼，再按 **Commit changes**。
6. 等 1 到 2 分鐘，Cloudflare 會自動檢查並上線。到 Cloudflare 的專案頁面看最新一次部署：顯示 Success 就完成了；如果是 Failed，點進去看「Build log」，最下面會用中文寫出哪裡有錯。修正後再存一次就好。

### 範例：修改一個景點

找到那個景點，改這幾個欄位：
- `note`：新的小提醒
- `verified`：改成今天的日期
- `src`：附上你查到的公告或新聞網址
- `rev`：加 1（例如 2 改成 3）。如果有使用者自己改過這個景點，他會看到「官方資料有更新」的提示。

### 範例：新增一個景點

複製下面這段，貼在 `places` 清單的最後一筆後面（前一筆的 `}` 後面要加逗號）。`id` 用目前最大的 q 編號加 1。

```json
{
  "id": "q130",
  "name": "景點名稱",
  "area": "台北市",
  "t": "nk",
  "walk": 1,
  "dur": 1,
  "cost": 0,
  "kid": true,
  "note": "給家長的一句小提醒，最多 90 字",
  "season": "",
  "fl": "",
  "status": "open",
  "verified": "2026-12-20",
  "risk": "low",
  "src": ["https://查到的來源網址"],
  "rev": 1
}
```

### 範例：景點暫停開放或停業

把 `status` 改成 `"paused"` 或 `"closed"`，在 `note` 寫清楚原因和預計恢復時間，並在 `src` 附上公告網址。恢復開放時再改回 `"open"`。

---

## 欄位對照

| 欄位 | 意思 | 可以填的值 |
|---|---|---|
| `id` | 編號，永遠不改 | `p0`–`p55`、`q0` 起 |
| `name` | 名稱 | 最多 24 字 |
| `area` | 區域 | 必須是 `areas` 裡的名稱 |
| `t` | 主題，可多個 | `n` 自然、`c` 文化、`k` 親子體驗、`f` 美食散步、`p` 放電玩水、`r` 雨天室內 |
| `walk` | 步行量 | 1 輕鬆、2 中等、3 挑戰 |
| `dur` | 至少要多久（從台北出發估算） | 1 半天、2 一天、3 兩天一夜 |
| `cost` | 花費 | 0 免費、1 低、2 中、3 高 |
| `kid` | 適合帶小孩 | `true` / `false` |
| `note` | 小提醒 | 最多 90 字，不能有 `< > " &` |
| `season` | 最佳月份 | `"11-3"` 表示 11 月到隔年 3 月；沒有就 `""` |
| `fl` | 特性 | `c` 山上涼爽、`w` 可以玩水、`s` 遮蔭多；可組合，沒有就 `""` |
| `status` | 營運狀態 | `open`、`paused`、`closed` |
| `verified` | 最後查證日期 | `YYYY-MM-DD`；超過 120 天，畫面上會顯示「資料較舊」 |
| `risk` | 資訊容易變動嗎 | `high`（山區、海邊、颱風路線、私人樂園）或 `low` |
| `src` | 來源網址 | `["https://..."]`；新增、暫停、停業時必填 |
| `rev` | 修改次數 | 每次改內容就加 1 |

---

## 查證節奏

| 什麼時候 | 做什麼 |
|---|---|
| 每次颱風或地震後 | 查受影響地區 `risk: "high"` 的景點 |
| 每月一次（約 30 分鐘） | 看 Cloudflare 最新一次部署的 Build log，裡面的「提醒」會列出該查的景點：超過 120 天沒查證的、超過 60 天沒查的高風險景點、下個月進入最佳季節的景點 |
| 每季一次 | 全面查證，順便找新開幕的熱門景點 |
| 收到使用者回報時 | 查證後更新 |

查證時優先看官方網站和政府公告，其次是主要新聞媒體。小提醒請用自己的話寫，不要直接複製別人網站的文字。

---

## 第一次上線（只要做一次）

### A. 把檔案放上 GitHub

1. 註冊或登入 [GitHub](https://github.com)。
2. 右上角 **+** → **New repository**。名稱填 `weekend-trip`，選 **Private** 或 **Public** 都可以，按 **Create repository**。
3. 在新的 repository 頁面點 **uploading an existing file**。
4. 把解壓縮後資料夾裡的**所有內容**（`site` 資料夾、`scripts` 資料夾、`README.md`）一起拖進去。注意要拖資料夾裡面的東西，不是外層資料夾本身。
5. 按 **Commit changes**。上傳後確認 GitHub 上看得到 `site/places.json` 和 `scripts/validate.mjs` 這兩個路徑。

### B. 用 Cloudflare Pages 上線

1. 註冊或登入 [Cloudflare](https://dash.cloudflare.com)（免費方案就夠用）。
2. 左側選單 **Workers & Pages** → **Create application** → 選 **Pages** 分頁 → **Connect to Git**。如果畫面預設是 Workers，找「Pages」或「Looking to deploy Pages?」的連結。
3. 選 **GitHub**，按 **Install & Authorize**，授權時可以只勾選 `weekend-trip` 這一個 repository。
4. 選 `weekend-trip` → **Begin setup**，填：
   - Project name：`weekend-trip`（會變成網址 `weekend-trip.pages.dev`，被用走的話換一個）
   - Framework preset：**None**
   - Build command：`node scripts/validate.mjs`
   - Build output directory：`site`
5. 按 **Save and Deploy**。等它跑完，就會得到網址。

之後每次在 GitHub 存檔，Cloudflare 都會自動檢查並更新網站。

### C. 把你目前的資料搬過去

新網站和 Claude 上的版本是不同網址，資料不會自動帶過去：
1. 在舊版本的「設定」頁按「複製備份碼」。
2. 打開新網站 → 設定 → 貼到「從備份碼還原」→ 按兩次匯入。

### D.（選擇性）設定「回報資訊有誤」表單

1. 在 Google 表單建一份問卷，至少有「景點名稱」「景點編號」「哪裡有誤」三題。不要收集電子郵件或姓名。
2. 右上角 ⋮ → **取得預先填入的連結**，在名稱欄填 `{name}`、編號欄填 `{id}`，按「取得連結」並複製。
3. 把連結貼到 `places.json` 開頭的 `feedbackUrl`。存檔後，每個景點旁會出現「回報資訊有誤」連結，並自動帶入景點名稱和編號。

---

## 在自己電腦上預覽（選擇性）

需要先安裝 Node.js。在資料夾裡執行：

```
node scripts/validate.mjs
cd site
python3 -m http.server 8000
```

然後打開 `http://localhost:8000`。直接雙擊 `index.html` 打不開資料，一定要透過網址開啟。
