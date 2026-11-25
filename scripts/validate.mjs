// 週末小旅行籤：上線前的資料檢查
// 用法：node scripts/validate.mjs
// 有「錯誤」就會停止上線（Cloudflare 會顯示部署失敗）；「提醒」只列出來給你參考，不會擋上線。
import { readFileSync } from "node:fs";

const FILE = new URL("../site/places.json", import.meta.url);
// 已經發出去的區域，順序不能改（使用者的旅行紀錄用順序記錄區域）。新區域只能加在最後面。
const FROZEN_AREAS = ["台北市","新北","基隆","宜蘭","桃園","新竹","苗栗","台中","南投","花蓮","彰化","雲林","嘉義","台南","高雄","屏東","台東"];
// 舊編號 p0–p55 是固定的，永遠不能少。
const FIXED_P = 56;
const STALE_DAYS = 120, HIGH_RISK_DAYS = 60;

const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);

let d;
try { d = JSON.parse(readFileSync(FILE, "utf8")); }
catch (e) { console.error("✗ places.json 不是合法的 JSON。最常見的原因是少了逗號、多了逗號，或引號沒有成對。\n  " + e.message); process.exit(1); }

const today = new Date(); const todayStr = today.toISOString().slice(0, 10);
const DATE = /^\d{4}-\d{2}-\d{2}$/, SEASON = /^(1[0-2]|[1-9])-(1[0-2]|[1-9])$/, URL_OK = /^https:\/\/\S+$/;
const BAD_CHARS = /[<>"&]/;

// ---- 檔頭 ----
if (!/^\d{4}\.\d{2}(\.\d+)?$/.test(d.dataVersion || "")) err(`dataVersion 要寫成「2026.11」或「2026.11.2」這種格式，現在是「${d.dataVersion}」`);
if (d.feedbackUrl && !URL_OK.test(d.feedbackUrl)) err("feedbackUrl 要是 https:// 開頭的網址，或留空字串 \"\"");

// ---- 區域 ----
const areas = Array.isArray(d.areas) ? d.areas : (err("找不到 areas 清單"), []);
FROZEN_AREAS.forEach((n, i) => { if (!areas[i] || areas[i].name !== n) err(`第 ${i + 1} 個區域必須是「${n}」。舊區域的順序不能改，新區域只能加在最後面`); });
const areaNames = new Set();
areas.forEach((a, i) => {
  if (!a || typeof a.name !== "string" || !a.name || BAD_CHARS.test(a.name)) err(`第 ${i + 1} 個區域名稱不正確`);
  if (typeof a.hr !== "number" || a.hr <= 0) err(`區域「${a && a.name}」的 hr（從台北出發幾小時）要是正數`);
  if (areaNames.has(a.name)) err(`區域「${a.name}」重複了`);
  areaNames.add(a && a.name);
});

// ---- 景點 ----
const places = Array.isArray(d.places) ? d.places : (err("找不到 places 清單"), []);
const ids = new Set(), nameArea = new Set();
let maxQ = -1; const qSeen = new Set(), pSeen = new Set();
places.forEach((p, i) => {
  const at = `第 ${i + 1} 筆（${p && p.id || "沒有 id"}・${p && p.name || "沒有名稱"}）`;
  if (!p || typeof p !== "object") return err(`${at} 格式不正確`);
  const m = /^([pq])(\d{1,5})$/.exec(p.id || "");
  if (!m) err(`${at} 的 id 要是 p 或 q 加數字，例如 q130`);
  else { (m[1] === "p" ? pSeen : qSeen).add(+m[2]); if (m[1] === "q") maxQ = Math.max(maxQ, +m[2]); }
  if (ids.has(p.id)) err(`${at} 的 id 重複了`); ids.add(p.id);
  if (typeof p.name !== "string" || !p.name.trim() || p.name.length > 24) err(`${at} 的名稱不能空白，最多 24 個字`);
  if (BAD_CHARS.test(p.name || "") || BAD_CHARS.test(p.note || "")) err(`${at} 的名稱或小提醒不能有 < > " & 這幾個符號`);
  const k = p.name + "|" + p.area; if (nameArea.has(k)) err(`${at} 和別的景點同名又同區域`); nameArea.add(k);
  if (!areaNames.has(p.area)) err(`${at} 的區域「${p.area}」不在 areas 清單裡`);
  if (!/^[nckfpr]+$/.test(p.t || "") || new Set(p.t).size !== p.t.length) err(`${at} 的主題 t 只能用 n c k f p r 這幾個字母，不能重複`);
  if (![1, 2, 3].includes(p.walk)) err(`${at} 的 walk 要是 1、2 或 3`);
  if (![1, 2, 3].includes(p.dur)) err(`${at} 的 dur 要是 1、2 或 3`);
  if (![0, 1, 2, 3].includes(p.cost)) err(`${at} 的 cost 要是 0 到 3`);
  if (typeof p.kid !== "boolean") err(`${at} 的 kid 要寫 true 或 false（不要加引號）`);
  if (typeof p.note !== "string" || p.note.length > 90) err(`${at} 的小提醒最多 90 個字（現在 ${String(p.note || "").length} 字）`);
  if (p.season && !SEASON.test(p.season)) err(`${at} 的 season 要寫成「11-3」這種格式，或留空字串`);
  if (!/^[cws]*$/.test(p.fl || "")) err(`${at} 的 fl 只能用 c w s`);
  if (!["open", "paused", "closed"].includes(p.status)) err(`${at} 的 status 要是 open、paused 或 closed`);
  if (!DATE.test(p.verified || "") || p.verified > todayStr) err(`${at} 的 verified 要是 YYYY-MM-DD 格式的日期，而且不能是未來`);
  if (!["low", "high"].includes(p.risk)) err(`${at} 的 risk 要是 low 或 high`);
  if (!Array.isArray(p.src) || !p.src.every(u => URL_OK.test(u))) err(`${at} 的 src 要是網址清單，例如 ["https://..."]`);
  if (!Number.isInteger(p.rev) || p.rev < 1) err(`${at} 的 rev 要是 1 以上的整數`);
  if (p.status !== "open" && !(p.src || []).length) err(`${at} 標成 ${p.status}，請在 src 附上公告或新聞來源`);

  // 提醒
  const age = (today - new Date(p.verified)) / 864e5;
  if (p.status === "open" && age > STALE_DAYS) warn(`超過 ${STALE_DAYS} 天沒查證：${p.id} ${p.name}（${p.verified}）`);
  else if (p.status === "open" && p.risk === "high" && age > HIGH_RISK_DAYS) warn(`高風險景點超過 ${HIGH_RISK_DAYS} 天沒查證：${p.id} ${p.name}（${p.verified}）`);
  if (p.status === "paused") warn(`暫停開放中，記得追蹤何時恢復：${p.id} ${p.name}`);
  if (p.season) { const nm = today.getMonth() + 2 > 12 ? 1 : today.getMonth() + 2; if (+p.season.split("-")[0] === nm) warn(`下個月（${nm} 月）進入最佳季節，記得先查管制或活動：${p.id} ${p.name}`); }
});
for (let i = 0; i < FIXED_P; i++) if (!pSeen.has(i)) err(`舊景點 p${i} 不見了。景點不能刪除，停業請把 status 改成 closed`);
for (let i = 0; i <= maxQ; i++) if (!qSeen.has(i)) err(`景點 q${i} 不見了。景點不能刪除，停業請把 status 改成 closed`);

// ---- 更新紀錄 ----
const log = Array.isArray(d.changelog) ? d.changelog : (err("找不到 changelog 清單"), []);
if (!log.length) err("changelog 至少要有一筆");
else {
  const c = log[0];
  if (c.version !== d.dataVersion) err(`changelog 第一筆的 version（${c.version}）要和 dataVersion（${d.dataVersion}）一樣。每次更新都要在 changelog 最上面加一筆`);
  if (!DATE.test(c.date || "")) err("changelog 第一筆的 date 要是 YYYY-MM-DD");
  if (typeof c.summary !== "string" || !c.summary.trim() || BAD_CHARS.test(c.summary)) err("changelog 第一筆要有 summary（一句話說明這次更新了什麼），不能有 < > \" &");
  for (const k of ["added", "updated", "paused"]) {
    if (!Array.isArray(c[k])) { err(`changelog 第一筆缺少 ${k} 清單（沒有就寫 []）`); continue; }
    c[k].forEach(id => { if (!ids.has(id)) err(`changelog 的 ${k} 裡有不存在的 id：${id}`); });
  }
  (c.added || []).forEach(id => { const p = places.find(x => x.id === id); if (p && !p.src.length) err(`新加入的 ${id} ${p.name} 要附來源網址（src）`); });
  const versions = log.map(x => x.version); if (new Set(versions).size !== versions.length) err("changelog 裡有重複的 version");
}

// ---- 結果 ----
const open = places.filter(p => p.status === "open").length;
console.log(`週末小旅行籤 資料檢查：版本 ${d.dataVersion}，共 ${places.length} 個景點（開放 ${open}），${areas.length} 個區域`);
if (warns.length) { console.log(`\n提醒 ${warns.length} 則（不會擋上線）：`); warns.forEach(w => console.log("  · " + w)); }
if (errors.length) { console.error(`\n✗ 有 ${errors.length} 個錯誤，這次不會上線，請修正後再存檔：`); errors.forEach(e => console.error("  ✗ " + e)); process.exit(1); }
console.log("\n✓ 檢查通過，可以上線。");
