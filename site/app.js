/* 週末小旅行籤：程式本體。景點資料在 places.json，請不要把資料寫回這裡。 */
(function(){
"use strict";
const DATA_KEY="weekend-trip-data";
const SAFE=s=>typeof s==="string"&&!/[<>"&]/.test(s);
function cleanPlaces(d){
  if(!d||typeof d!=="object"||!Array.isArray(d.areas)||!Array.isArray(d.places)||typeof d.dataVersion!=="string")return null;
  if(!d.areas.length||!d.areas.every(a=>a&&SAFE(a.name)&&typeof a.hr==="number"))return null;
  const names=new Set(d.areas.map(a=>a.name));
  d.places=d.places.filter(p=>p&&/^[pq]\d{1,5}$/.test(p.id)&&typeof p.name==="string"&&names.has(p.area)&&/^[nckfpr]+$/.test(p.t||"")&&[1,2,3].includes(p.walk)&&[1,2,3].includes(p.dur)&&[0,1,2,3].includes(p.cost));
  if(!d.places.length)return null;
  if(!Array.isArray(d.changelog))d.changelog=[];
  return d;
}
async function loadData(){
  try{
    const r=await fetch("places.json",{cache:"no-cache"});
    if(!r.ok)throw new Error(r.status);
    const d=cleanPlaces(await r.json());if(!d)throw new Error("bad data");
    try{localStorage.setItem(DATA_KEY,JSON.stringify(d))}catch(e){}
    return {d,offline:false};
  }catch(e){
    try{const d=cleanPlaces(JSON.parse(localStorage.getItem(DATA_KEY)));if(d)return {d,offline:true}}catch(e2){}
    return null;
  }
}
loadData().then(res=>{
  if(!res){document.getElementById("bootMsg").textContent="景點資料載入失敗，請確認網路連線後再試一次。";document.getElementById("bootRetry").hidden=false;return}
  main(res.d,res.offline);
  document.body.classList.remove("booting");
});
document.getElementById("bootRetry").addEventListener("click",()=>location.reload());

function main(DATA,OFFLINE){
const AREAS=DATA.areas;
const THEMES=[
{id:"n",name:"自然",desc:"走進山林、海邊或濕地"},
{id:"c",name:"文化",desc:"老街、博物館、歷史建築"},
{id:"k",name:"親子體驗",desc:"孩子可以動手玩、看動物、學東西"},
{id:"f",name:"美食散步",desc:"邊走邊吃，慢慢逛"},
{id:"p",name:"放電玩水",desc:"大量跑跳、踩水、騎車"},
{id:"r",name:"雨天室內",desc:"下雨也不怕的室內行程"}
];
const PLANS=[
{name:"半天・小資",dur:1,budget:"每人 300 元內",cost:1,maxHr:1},
{name:"一日・小資",dur:2,budget:"每人 600 元內",cost:1,maxHr:2},
{name:"一日・適中",dur:2,budget:"每人 1500 元內",cost:2,maxHr:2.5},
{name:"一日・寬裕",dur:2,budget:"每人 1500 元以上",cost:3,maxHr:2.5},
{name:"兩天一夜・適中",dur:3,budget:"含住宿每人 3000 元內",cost:2,maxHr:9},
{name:"兩天一夜・寬裕",dur:3,budget:"含住宿每人 3000 元以上",cost:3,maxHr:9}
];
const TAGS_GOOD=["孩子玩得很開心","風景很美","吃得很滿足","步調剛好","交通順利","人不多","學到新東西"];
const TAGS_BAD=["走太多路","太熱","人太多","交通太久","孩子覺得無聊","花太多錢","天氣不好"];
const MISSIONS={
n:["找到三種不同形狀的葉子","聽一聽，數數看有幾種鳥叫聲","撿一顆你覺得最特別的石頭，拍照後放回原處"],
c:["找到一個比爸爸媽媽還老的東西","問問看這裡以前是做什麼的","畫下你最喜歡的一個窗戶或門"],
k:["找到你最喜歡的動物或展品，說出它的三個特點","親手做一樣東西帶回家","問工作人員一個問題"],
f:["幫全家選一樣大家都沒吃過的點心","猜猜看這道菜用了哪些材料","給今天吃到的東西打分數，最高五顆星"],
p:["比賽誰先跑到下一棵樹","數數看今天踩了幾次水","找到一個可以大聲喊叫的地方"],
r:["找到一個會發出聲音的展品","用三個字形容這個地方","拍一張你覺得最酷的照片"]
};
const LATEST=(DATA.changelog&&DATA.changelog[0])||{version:DATA.dataVersion,added:[],updated:[],paused:[]};
/* 「最新熱點」＝最近一次更新往前 90 天內，所有更新紀錄 added 裡的景點 */
const NEW_DAYS=90;
const NEW_LABEL="最新熱點";
const STALE_DAYS=120;
const KEY="weekend-trip-v1";
const WEATHER=[{id:"any",name:"不限"},{id:"hot",name:"天氣炎熱"},{id:"rain",name:"可能下雨"},{id:"cool",name:"涼爽好天氣"}];

const $=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const range=n=>[...Array(n).keys()];
function rand(n){if(window.crypto&&crypto.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n}return Math.floor(Math.random()*n)}
function shuffle(arr,avoid){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]]}if(avoid!=null&&a.length>1&&a[0]===avoid){const j=1+rand(a.length-1);[a[0],a[j]]=[a[j],a[0]]}return a}
const uid=p=>p+Date.now().toString(36)+rand(1e6).toString(36);
const WALK=["","輕鬆","中等","挑戰"],DUR=["","半天","一天","兩天一夜"],COST=["免費","低","中","高"];
const TH=id=>THEMES.find(t=>t.id===id)||{id:"",name:"其他",desc:""};
const fmtHr=h=>h<1?Math.round(h*60)+" 分鐘":(Math.floor(h)+" 小時"+(h%1?" "+Math.round(h%1*60)+" 分":""));
function nextSat(){const d=new Date();d.setDate(d.getDate()+((6-d.getDay()+7)%7||7));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}

/* ---------- 狀態 ---------- */
const BUILT=DATA.places.map(p=>({id:p.id,name:p.name,area:p.area,t:p.t.split(""),walk:p.walk,dur:p.dur,cost:p.cost,kid:!!p.kid,note:p.note||"",season:p.season||"",fl:p.fl||"",status:p.status||"open",verified:p.verified||"",rev:p.rev||1}));
const BASE=id=>BUILT.find(p=>p.id===id);
function inSeason(p,m){if(!p.season)return null;const [a,b]=p.season.split("-").map(Number);m=m||(new Date().getMonth()+1);return a<=b?(m>=a&&m<=b):(m>=a||m<=b)}
const FLAG={c:"山上涼爽",w:"可以玩水",s:"遮蔭多"};
let S=null;
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
function fresh(){return {deck:{a:{o:shuffle(range(AREAS.length)),p:0},t:{o:shuffle(range(THEMES.length)),p:0},b:{o:shuffle(range(PLANS.length)),p:0}},area:null,theme:null,plan:null,main:null,side:null,rain:null,lock:{area:false,theme:false,plan:false},skip:true,prefer:false,out:0,tab:"draw",set:{home:"台北",members:[{id:"m1",name:"大人",age:""},{id:"m2",name:"大人 2",age:""},{id:"m3",name:"孩子",age:""}],walk:2,trans:"car"},custom:[],visited:[],trips:[]}}
const ID_RE=/^[A-Za-z0-9_-]{1,40}$/,DATE_RE=/^\d{4}-\d{2}-\d{2}$/,SEASON_RE=/^(1[0-2]|[1-9])-(1[0-2]|[1-9])$/;
const str=(v,n)=>typeof v==="string"?v.slice(0,n):"";
const int=(v,lo,hi,d)=>{v=Math.floor(+v);return Number.isFinite(v)&&v>=lo&&v<=hi?v:d};
const okId=v=>typeof v==="string"&&ID_RE.test(v)?v:null;
function cleanData(d){
  const set=d&&d.set&&typeof d.set==="object"?d.set:{};
  let members=(Array.isArray(set.members)?set.members:[]).slice(0,8).map((m,i)=>({id:okId(m&&m.id)||("m"+(i+1)),name:str(m&&m.name,10).trim()||"成員",age:str(m&&String(m.age??""),3).replace(/\D/g,"")}));
  const seen=new Set();members=members.filter(m=>!seen.has(m.id)&&seen.add(m.id));
  if(!members.length) members=[{id:"m1",name:"大人",age:""}];
  const custom=(Array.isArray(d&&d.custom)?d.custom:[]).slice(0,200).map(c=>{
    const id=okId(c&&c.id);const t=(Array.isArray(c&&c.t)?c.t:[]).filter(x=>THEMES.some(th=>th.id===x));
    if(!id||!/^u/.test(id)||!t.length||!AREAS.some(a=>a.name===(c&&c.area)))return null;
    return {id,name:str(c.name,24).trim()||"未命名地點",area:c.area,t,dur:int(c.dur,1,3,1),walk:int(c.walk,1,3,1),cost:int(c.cost,0,3,1),kid:!!c.kid,note:str(c.note,60),season:SEASON_RE.test(c.season||"")?c.season:"",fl:""};
  }).filter(Boolean);
  const placeIds=new Set(BUILT.map(p=>p.id).concat(custom.map(c=>c.id)));
  const memIds=new Set(members.map(m=>m.id));
  const visited=[...new Set((Array.isArray(d&&d.visited)?d.visited:[]).filter(x=>placeIds.has(x)))];
  const trips=(Array.isArray(d&&d.trips)?d.trips:[]).slice(0,500).map(t=>{
    if(!t||!placeIds.has(t.main))return null;
    const ratings={};if(t.ratings&&typeof t.ratings==="object")Object.entries(t.ratings).forEach(([k,v])=>{const n=int(v,1,5,0);if(memIds.has(k)&&n)ratings[k]=n});
    const pid=v=>placeIds.has(v)?v:null;
    return {id:okId(t.id)||uid("t"),date:DATE_RE.test(t.date||"")?t.date:"",status:t.status==="done"?"done":"plan",area:int(t.area,0,AREAS.length-1,0),theme:int(t.theme,0,THEMES.length-1,0),plan:int(t.plan,0,PLANS.length-1,0),main:t.main,side:pid(t.side),rain:pid(t.rain),ratings,tags:(Array.isArray(t.tags)?t.tags:[]).filter(x=>TAGS_GOOD.includes(x)||TAGS_BAD.includes(x)),note:str(t.note,120)};
  }).filter(Boolean);
  const builtIds=new Set(BUILT.map(p=>p.id));
  const marks={};if(d&&d.marks&&typeof d.marks==="object")Object.entries(d.marks).forEach(([k,v])=>{if(placeIds.has(k)&&v&&(v.s||v.h))marks[k]={...(v.s?{s:true}:{}),...(v.h?{h:true}:{})}});
  const hidden=[...new Set((Array.isArray(d&&d.hidden)?d.hidden:[]).filter(x=>builtIds.has(x)))];
  const edits={};if(d&&d.edits&&typeof d.edits==="object")Object.entries(d.edits).forEach(([k,e])=>{if(!builtIds.has(k)||!e)return;const t=(Array.isArray(e.t)?e.t:[]).filter(x=>THEMES.some(th=>th.id===x));if(!t.length||!AREAS.some(a=>a.name===e.area))return;edits[k]={name:str(e.name,24).trim()||BUILT.find(p=>p.id===k).name,area:e.area,t,dur:int(e.dur,1,3,1),walk:int(e.walk,1,3,1),cost:int(e.cost,0,3,1),kid:!!e.kid,note:str(e.note,60),season:SEASON_RE.test(e.season||"")?e.season:"",rev:int(e.rev,0,99999,BASE(k).rev)}});
  return {set:{home:str(set.home,12).trim()||"台北",members,walk:int(set.walk,1,3,2),trans:set.trans==="public"?"public":"car"},custom,visited,trips,marks,hidden,edits};
}
function cleanState(){
  const c=cleanData(S);Object.assign(S,c);
  const ok=v=>allPlaces().some(p=>p.id===v);
  S.area=Number.isInteger(S.area)&&AREAS[S.area]?S.area:null;S.theme=Number.isInteger(S.theme)&&THEMES[S.theme]?S.theme:null;S.plan=Number.isInteger(S.plan)&&PLANS[S.plan]?S.plan:null;
  if(!ok(S.main))S.main=null;if(!ok(S.side))S.side=null;if(!ok(S.rain))S.rain=null;
  ["a","t","b"].forEach((k,i)=>{const n=[AREAS,THEMES,PLANS][i].length;const dk=S.deck&&S.deck[k];if(!dk||!Array.isArray(dk.o)||dk.o.length!==n||!dk.o.every(x=>Number.isInteger(x)&&x>=0&&x<n))S.deck[k]={o:shuffle(range(n)),p:0};S.deck[k].p=int(S.deck[k].p,0,n,0)});
  S.lock={area:!!(S.lock&&S.lock.area),theme:!!(S.lock&&S.lock.theme),plan:!!(S.lock&&S.lock.plan)};
  S.out=int(S.out,0,4,0);S.skip=S.skip!==false;S.prefer=!!S.prefer;
  if(!S.vote||!Array.isArray(S.vote.cands)||!S.vote.cands.every(c=>c&&ok(c.main)&&AREAS[c.area]&&THEMES[c.theme]&&PLANS[c.plan]))S.vote={cands:[],votes:{}};
  else S.vote.votes=Object.fromEntries(Object.entries(S.vote.votes||{}).filter(([k,v])=>S.set.members.some(m=>m.id===k)&&Number.isInteger(v)&&v>=0&&v<S.vote.cands.length));
}
if(!S||typeof S!=="object"||!S.deck||!S.set||!Array.isArray(S.trips)){S=fresh();S.seenData=DATA.dataVersion}
if(typeof S.seenData!=="string")S.seenData="";
if(S.deck.a.o.length!==AREAS.length){S.deck.a={o:shuffle(range(AREAS.length)),p:0}}
if(!WEATHER.some(w=>w.id===S.weather)) S.weather="any";
if(typeof S.seasonFirst!=="boolean") S.seasonFirst=true;
if(typeof S.markBoost!=="boolean") S.markBoost=false;
if(!S.vote||!Array.isArray(S.vote.cands)) S.vote={cands:[],votes:{}};
cleanState();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

/* ---------- 景點 ---------- */
function allPlaces(){
  const E=S.edits||{},H=new Set(S.hidden||[]);
  return BUILT.map(p=>E[p.id]?{...p,...E[p.id],edited:true,stale:(E[p.id].rev||0)<p.rev,hidden:H.has(p.id)}:{...p,hidden:H.has(p.id)})
    .concat(S.custom.map(c=>({...c,season:c.season||"",fl:c.fl||"",mine:true,hidden:false})));
}
const ym=d=>String(d||"").slice(0,7).replace("-","/");
function isFresh(p){if(!p.verified)return false;const t=Date.parse(p.verified);return Number.isFinite(t)&&(Date.now()-t)/864e5<=STALE_DAYS}
function verifiedHTML(p,tag){if(p.mine||p.edited||!p.verified)return "";const f=isFresh(p);return `<${tag} class="${tag==="span"?"badge ":""}${f?"ok":""}">${I("shield")}${f?"已查證 "+ym(p.verified):"查證於 "+ym(p.verified)+"・資料較舊"}</${tag}>`}
const isOpen=p=>!p.status||p.status==="open";
function drawPlaces(){return allPlaces().filter(p=>!p.hidden&&isOpen(p))}
const NEWSET=new Set((DATA.changelog||[]).filter(c=>{const a=Date.parse(LATEST.date),b=Date.parse(c.date);return Number.isFinite(a)&&Number.isFinite(b)&&(a-b)/864e5<=NEW_DAYS}).flatMap(c=>Array.isArray(c.added)?c.added:[]));
function statusHTML(p,tag){if(isOpen(p))return "";const st=p.status;return `<${tag} class="badge warn">${I("alert")}${st==="closed"?"已停業，不會被抽到":"暫停開放，不會被抽到"}</${tag}>`}
function mk(id){return (S.marks&&S.marks[id])||{}}
function marksHTML(id){const m=mk(id);return (m.s?'<span class="ic ic-s" aria-label="星星">★</span>':"")+(m.h?'<span class="ic ic-h" aria-label="愛心">♥</span>':"")}
const P=id=>allPlaces().find(p=>p.id===id);
const AI=name=>AREAS.findIndex(a=>a.name===name);
function hasKids(){return S.set.members.some(m=>m.age!==""&&+m.age<13)}
function isTaipei(){return /台北|臺北/.test(S.set.home)}

/* ---------- 喜好 ---------- */
function doneTrips(){return S.trips.filter(t=>t.status==="done"&&t.ratings&&Object.keys(t.ratings).length)}
function tripAvg(t){const v=Object.values(t.ratings).filter(Boolean);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null}
function themeScores(memberId){
  const sc={};doneTrips().forEach(t=>{const r=memberId?t.ratings[memberId]:tripAvg(t);if(!r)return;const pl=P(t.main);const ths=new Set([THEMES[t.theme]?THEMES[t.theme].id:null].concat(pl?pl.t:[]).filter(Boolean));ths.forEach(x=>{(sc[x]=sc[x]||[]).push(r)})});
  return Object.fromEntries(Object.entries(sc).map(([k,a])=>[k,{avg:a.reduce((p,c)=>p+c,0)/a.length,n:a.length}]));
}
function weightOf(pl){
  let w=1;
  if(S.seasonFirst){const s=inSeason(pl);if(s===true)w*=2.5;else if(s===false)w*=.35}
  const out=pl.t.some(x=>x==="n"||x==="p")&&!pl.t.includes("r");
  if(S.weather==="hot"){if(/[cw]/.test(pl.fl)||pl.t.includes("r"))w*=2.5;else if(out&&!pl.fl.includes("s"))w*=.4}
  if(S.weather==="rain"){if(pl.t.includes("r"))w*=3;else if(out)w*=.25}
  if(S.weather==="cool"&&out)w*=1.6;
  if(S.markBoost){const m=mk(pl.id);if(m.s||m.h)w*=m.s&&m.h?4:3}
  return w*prefW(pl);
}
function prefW(pl){
  if(!S.prefer) return 1;
  const sc=themeScores(null);const ds=pl.t.map(x=>sc[x]?sc[x].avg-3:0);
  const m=ds.length?ds.reduce((a,b)=>a+b,0)/ds.length:0;
  return Math.max(.15,1+.5*m);
}
function wpick(list){if(!list.length)return null;const w=list.map(weightOf);const tot=w.reduce((a,b)=>a+b,0);let r=Math.random()*tot;for(let i=0;i<list.length;i++){r-=w[i];if(r<=0)return list[i]}return list[list.length-1]}

/* ---------- 抽籤 ---------- */
function take(dk,n,avoid){const d=S.deck[dk];if(d.p>=d.o.length){d.o=shuffle(range(n),avoid);d.p=0}return d.o[d.p++]}
let drawMsg="";
/* 放寬順序：0 完全符合 → 1 不限車程 → 2 含去過 → 3 不限步行 → 4 不限時間預算 → 5 不限主題 */
const RELAX_MSG=["","","符合條件的地方都去過了，這次讓去過的地方也加入。","符合步行上限的地方不夠，這次放寬了步行限制。","在這個預算時間內找不到合適的地方，推薦的地點可能需要更多時間或預算。",""];
function candidates(ai,ti,bi,L){
  const area=AREAS[ai],th=THEMES[ti],pl=PLANS[bi];
  if(L<1&&isTaipei()&&area.hr>pl.maxHr) return [];
  return drawPlaces().filter(p=>p.area===area.name
    &&(L>=5||p.t.includes(th.id))
    &&(L>=4||(p.dur<=pl.dur&&(pl.cost>1||p.cost<=1)))
    &&(L>=3||p.walk<=S.set.walk)
    &&(L>=2||!S.skip||!S.visited.includes(p.id))
    &&(L>=5||!hasKids()||!["k","p"].includes(th.id)||p.kid));
}
function draw(){
  drawMsg="";
  if(!S.lock.plan||S.plan==null) S.plan=take("b",PLANS.length,S.plan);
  if(!S.lock.theme||S.theme==null){S.theme=take("t",THEMES.length,S.theme);if(S.weather==="rain"&&Math.random()<.6)S.theme=THEMES.findIndex(t=>t.id==="r")}
  const areaLocked=S.lock.area&&S.area!=null;
  const tryArea=L=>{
    if(areaLocked) return candidates(S.area,S.theme,S.plan,L).length?S.area:null;
    for(let g=0;g<AREAS.length;g++){const ai=take("a",AREAS.length,S.area);if(candidates(ai,S.theme,S.plan,L).length)return ai}
    return null;
  };
  let ai=null,L=0;
  for(L=0;L<=5;L++){
    ai=tryArea(L);
    if(ai==null&&!S.lock.theme){for(let g=0;g<THEMES.length&&ai==null;g++){S.theme=take("t",THEMES.length,S.theme);ai=tryArea(L)}}
    if(ai!=null)break;
  }
  if(ai==null){drawMsg="找不到符合條件的地方，試試解除鎖定。";return}
  S.area=ai;
  const area=AREAS[ai],pl=PLANS[S.plan],th=THEMES[S.theme];
  const cands=candidates(ai,S.theme,S.plan,L);
  S.main=wpick(cands).id;
  const msgs=[];
  if(isTaipei()&&area.hr>pl.maxHr) msgs.push(`${area.name}從${S.set.home}出發約 ${fmtHr(area.hr)}，以「${pl.name}」來說車程偏長，可以考慮改成兩天一夜。`);
  if(L===5) msgs.push(`${area.name}目前沒有「${th.name}」類型的地方，先推薦區域內其他類型的景點。可以到設定把想去的地方加進口袋名單。`);
  else if(RELAX_MSG[L]) msgs.push(RELAX_MSG[L]);
  drawMsg=msgs.join(" ");
  const used=new Set([S.main]);
  const fit=p=>p.area===area.name&&!used.has(p.id);
  const pool=drawPlaces().filter(p=>fit(p)&&p.dur<=pl.dur&&p.walk<=S.set.walk&&(pl.cost>1||p.cost<=1));
  const sidePool=pool.filter(p=>!S.skip||!S.visited.includes(p.id));
  S.side=pl.dur>=2?(wpick(sidePool.length?sidePool:pool)||{}).id||null:null;
  if(S.side)used.add(S.side);
  const rainPool=drawPlaces().filter(p=>fit(p)&&p.t.includes("r"));
  S.rain=rainPool.length?rainPool[rand(rainPool.length)].id:null;
}
/* ---------- 輸出 ---------- */
const OUTS=["行程方向","待查清單","打包清單","小小探險任務","給 AI 排行程"];
function hrText(a){return isTaipei()?`，從${S.set.home}出發車程約 ${fmtHr(a.hr)}`:""}
function buildOut(k){
  const a=AREAS[S.area],th=THEMES[S.theme],pl=PLANS[S.plan],m=P(S.main),sd=S.side?P(S.side):null,rn=S.rain?P(S.rain):null;
  if(!m) return "";
  const trans=S.set.trans==="car"?"開車":"大眾運輸";
  if(k===0){
    let tl;
    if(pl.dur===1) tl=`09:30 出發${hrText(a)}\n抵達後　${m.name}，玩 2 到 3 小時\n12:30　附近吃午餐（${a.food}）\n13:30　慢慢回家，留點體力給晚上`;
    else if(pl.dur===2) tl=`08:30 出發${hrText(a)}\n上午　${m.name}\n12:30　午餐（${a.food}）\n下午　${sd?sd.name:"在附近隨意散步"}\n16:30　回程，避開晚上的回程車潮`;
    else tl=`第一天\n上午出發${hrText(a)}\n中午　抵達後吃午餐（${a.food}）\n下午　${m.name}\n傍晚　入住，晚上早點休息\n\n第二天\n上午　${sd?sd.name:"睡飽後在住處附近散步"}\n中午　午餐後開始回程`;
    const wx={hot:"\n天氣提醒：天氣熱，記得補水、防曬，戶外行程盡量排在上午或傍晚。",rain:"\n天氣提醒：可能下雨，雨天備案要先查好，戶外行程隨時準備改室內。",cool:"\n天氣提醒：天氣舒服，很適合多走一點戶外。"}[S.weather]||"";
    return `【週末小旅行】${a.name}・${th.name}・${pl.name}
預算：${pl.budget}${wx}
交通：${trans}。${a.trans}

▍主要景點：${m.name}
${m.note}${inSeason(m)?`
正當季（${seasonLabel(m)}），季節限定活動和人潮請先查詢。`:""}
（步行${WALK[m.walk]}・花費${COST[m.cost]}${m.kid?"・適合帶小孩":""}）
${sd?`\n▍搭配景點：${sd.name}\n${sd.note}\n`:""}${rn?`\n▍雨天備案：${rn.name}\n${rn.note}\n`:"\n▍雨天備案：這個區域室內選項較少，下雨時可以改去附近的博物館或百貨公司。\n"}
▍時間軸
${tl}`;
  }
  if(k===1){
    const places=[m,sd,rn].filter(Boolean);
    return `【出發前待查】${a.name}・${pl.name}
${places.map(p=>`☐ ${p.name}：開放時間、休館日、是否需要預約`).join("\n")}
☐ 門票價格與優惠（學生、兒童、在地居民）
☐ 出發前一天看天氣與降雨機率${th.id==="n"||th.id==="p"?"，戶外行程特別注意":""}
☐ ${S.set.trans==="car"?"停車場位置與假日是否容易客滿":"大眾運輸班次，特別是回程末班車"}
☐ 午餐地點，熱門餐廳是否需要訂位
${hasKids()?"☐ 嬰兒車能不能推、有沒有哺乳室和親子廁所\n":""}${pl.dur===3?"☐ 住宿訂房、入住與退房時間、早餐是否包含\n":""}☐ 有沒有季節限定的活動或封閉（花季、戲水期、步道整修）
☐ 道路或步道的最新公告（颱風、豪雨後特別注意）`;
  }
  if(k===2){
    const base=["水壺","行動電源","面紙與濕紙巾","零錢與悠遊卡"];
    const byTheme={n:["防蚊液","帽子","好走的鞋","薄外套"],c:["好走的鞋","小筆記本"],k:["換洗衣物一套","小毛巾"],f:["環保餐具","購物袋"],p:["換洗衣物","毛巾","拖鞋","防曬"],r:["輕便雨衣或傘","一雙乾的襪子"]};
    const list=base.concat(byTheme[th.id]||[]).concat(hasKids()?["孩子的零食和水","小玩具或繪本","備用衣物"]:[]).concat(pl.dur===3?["過夜盥洗用品","睡衣","常備藥品"]:[]);
    return `【打包清單】${a.name}・${th.name}\n`+[...new Set(list)].map(x=>"☐ "+x).join("\n");
  }
  if(k===3){
    const ms=(MISSIONS[th.id]||MISSIONS.n).concat(m.t.filter(x=>x!==th.id).slice(0,1).map(x=>MISSIONS[x][rand(3)]));
    return `【小小探險任務】今天要去：${m.name}
完成一個任務就畫一個勾！

${ms.map((x,i)=>`☐ 任務 ${i+1}：${x}`).join("\n")}

☐ 最後任務：回家後跟大家說，今天最好玩的是什麼？`;
  }
  if(k===4){
    const mem=S.set.members.map(x=>x.name+(x.age!==""?`（${x.age} 歲）`:"")).join("、");
    const sc=themeScores(null);const likes=Object.entries(sc).filter(([,v])=>v.n>=2).sort((a,b)=>b[1].avg-a[1].avg).slice(0,2).map(([k])=>TH(k).name);
    const bad={};doneTrips().forEach(t=>(t.tags||[]).forEach(x=>{if(TAGS_BAD.includes(x))bad[x]=(bad[x]||0)+1}));
    const avoid=Object.entries(bad).filter(([,n])=>n>=2).map(([k])=>k);
    return `請幫我規劃一趟週末小旅行。

出發地：${S.set.home}
同行：${mem}
區域：${a.name}
主題：${th.name}（${th.desc}）
天數與預算：${pl.name}，${pl.budget}
交通方式：${trans}
${S.weather!=="any"?`天氣預期：${WEATHER.find(w=>w.id===S.weather).name}
`:""}出遊月份：${new Date().getMonth()+1} 月
步行上限：${WALK[S.set.walk]}
一定要去：${m.name}${sd?`\n也想去：${sd.name}`:""}
${likes.length?`我們家通常比較喜歡：${likes.join("、")}\n`:""}${avoid.length?`我們家比較怕：${avoid.join("、")}\n`:""}
請給我：
1. 依時間排好的行程，標出每段車程與停留時間
2. 午餐和點心的建議（說明是哪一類店，不用列太多）
3. 一個雨天備案
4. 需要事先預約或特別注意的事

請提醒我哪些資訊需要再到官方網站確認，不要自己猜開放時間或票價。`;
  }
}

/* ---------- 介面工具 ---------- */
const RM=()=>{try{return !!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)}catch(e){return false}};
const I=(n,c)=>`<svg class="i${c?" "+c:""}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
function scrollToEl(el){if(el&&el.scrollIntoView)el.scrollIntoView({behavior:RM()?"auto":"smooth",block:"start"})}
function selOf(el){
  if(!el||el===document.body||!el.getAttribute)return null;
  if(el.id)return "#"+el.id;
  const a=[...(el.attributes||[])].filter(x=>x.name.startsWith("data-"));
  return a.length?a.map(x=>`[${x.name}="${String(x.value).replace(/["\\]/g,"\\$&")}"]`).join(""):null;
}
/* 重新繪製後把焦點放回同一顆按鈕（鍵盤使用者不會迷路）；fn 可回傳要聚焦的選擇器 */
function rf(fn){const sel=selOf(document.activeElement);const r=fn();const target=typeof r==="string"?r:sel;if(target){try{const el=document.querySelector(target);if(el&&el!==document.activeElement&&el.focus)el.focus({preventScroll:typeof r!=="string"})}catch(e){}}}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}

/* 提示訊息：3–6 秒自動消失，不搶焦點，可帶「復原」 */
function toast(msg,opt){
  opt=opt||{};const box=$("toasts");if(!box||!box.appendChild||!document.createElement)return;
  const t=document.createElement("div");t.className="toast";
  t.innerHTML=`<span class="msg">${esc(msg)}</span>${opt.action?`<button type="button" class="act">${opt.icon===false?"":I("undo")}${esc(opt.action)}</button>`:""}<button type="button" class="x" aria-label="關閉提示">${I("x")}</button>`;
  let done=false,timer=null;const close=()=>{if(done)return;done=true;clearTimeout(timer);t.classList.add("out");setTimeout(()=>t.remove(),RM()?0:160)};
  if(opt.action)t.querySelector(".act").onclick=()=>{close();if(opt.onAction)opt.onAction()};
  t.querySelector(".x").onclick=close;
  while(box.children.length>=3)box.firstElementChild.remove();
  box.appendChild(t);
  const ms=opt.ms||(opt.action?6000:4000);timer=setTimeout(close,ms);
  t.addEventListener("mouseenter",()=>clearTimeout(timer));t.addEventListener("mouseleave",()=>{clearTimeout(timer);timer=setTimeout(close,2000)});
  t.addEventListener("focusin",()=>clearTimeout(timer));
}
const snapshot=()=>JSON.stringify(S);
function restore(snap,msg){try{S=JSON.parse(snap)}catch(e){return}cleanState();save();rerender();toast(msg||"已復原。")}
function rerender(){const t=S.tab;if(t==="draw")renderDraw(false);if(t==="trips")renderTrips();if(t==="set")renderSet();if(t==="spots")renderSpots();renderHead()}
function setErr(inputId,errId,msg){const e=$(errId);if(e)e.innerHTML=msg?I("alert")+`<span>${esc(msg)}</span>`:"";if(inputId&&$(inputId).setAttribute)$(inputId).setAttribute("aria-invalid",msg?"true":"false")}

/* ---------- 抽籤頁 ---------- */
let pickOpen=null;
function fbLink(p,cls){const u=String(DATA.feedbackUrl||"");if(!/^https:\/\//.test(u)||p.mine)return "";const href=u.replace("{id}",encodeURIComponent(p.id)).replace("{name}",encodeURIComponent(p.name));return `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${I("flag")}回報資訊有誤<span class="sr-only">：${esc(p.name)}（開新視窗）</span></a>`}
function mapURL(p){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.name+" "+p.area)}
function seasonLabel(p){if(!p.season||!SEASON_RE.test(p.season))return "";const [a,b]=p.season.split("-");return `最佳 ${a}–${b} 月`}
function marksHTML(id){const m=mk(id);return (m.s?`<span class="mk-ic is-s" role="img" aria-label="已標星星">${I("star")}</span>`:"")+(m.h?`<span class="mk-ic is-h" role="img" aria-label="已標愛心">${I("heart")}</span>`:"")}
function markBtns(p){const m=mk(p.id);return `<button type="button" class="icon-btn mk-btn" data-mk="${p.id}" data-k="s" aria-pressed="${!!m.s}" aria-label="星星標註：${esc(p.name)}" title="星星">${I("star")}</button><button type="button" class="icon-btn mk-btn" data-mk="${p.id}" data-k="h" aria-pressed="${!!m.h}" aria-label="愛心標註：${esc(p.name)}" title="愛心">${I("heart")}</button>`}
function tagsHTML(p){const ins=inSeason(p);return p.t.map(x=>`<li>${TH(x).name}</li>`).join("")+`<li>步行${WALK[p.walk]}</li><li>花費${COST[p.cost]}</li>`+(p.season?`<li class="${ins?"hot":""}">${seasonLabel(p)}</li>`:"")+[...(p.fl||"")].map(f=>FLAG[f]?`<li>${FLAG[f]}</li>`:"").join("")+(p.mine?"<li>我新增的</li>":"")+(NEWSET.has(p.id)?`<li class="hot">${NEW_LABEL}</li>`:"")+statusHTML(p,"li")+verifiedHTML(p,"li")}
function spotHTML(p,head){
  if(!p)return "";const ins=inSeason(p);
  return `<div class="spot"><div class="spot-top"><span class="spot-kind">${head}</span>${ins===true?'<span class="badge hot">正當季</span>':""}<span class="spot-marks">${markBtns(p)}</span></div><h3 class="spot-name">${marksHTML(p.id)}${esc(p.name)}${S.visited.includes(p.id)?`<span class="badge ok">${I("check")}去過</span>`:""}</h3>${p.note?`<p class="spot-note">${esc(p.note)}</p>`:""}<ul class="tags" aria-label="特色">${tagsHTML(p)}</ul><a class="link" href="${mapURL(p)}" target="_blank" rel="noopener">${I("map")}在地圖上看<span class="sr-only">${esc(p.name)}（開新視窗）</span>${I("external","i-sm")}</a>${fbLink(p,"link")}</div>`;
}
const ROW_IC={area:"pin",theme:"tag",plan:"clock"};
function trow(key,label,val,sub,opts){
  const lk=!!S.lock[key],open=pickOpen===key;
  return `<div class="t-row"><div><span class="t-lb">${I(ROW_IC[key])}${label}${lk?`<span class="lock-tag">${I("lock","i-sm")}已鎖定</span>`:""}</span><b class="t-val">${esc(val)}</b>${sub?`<span class="t-sub">${esc(sub)}</span>`:""}</div><div class="t-ops"><button type="button" class="icon-btn" data-re="${key}" aria-label="換一個${label}" title="換一個${label}">${I("shuffle")}</button><button type="button" class="icon-btn" data-lock="${key}" aria-pressed="${lk}" aria-label="鎖住${label}，重抽時不換" title="${lk?"解除鎖定":"鎖住不換"}">${I(lk?"lock":"unlock")}</button><button type="button" class="icon-btn" data-pick="${key}" aria-expanded="${open}"${open?` aria-controls="pick-${key}"`:""} aria-label="自己選${label}" title="自己選${label}">${I("list")}</button></div>${open?`<div class="t-pick field"><label class="sr-only" for="pick-${key}">指定${label}</label><select class="select" id="pick-${key}" data-sel="${key}">${opts}</select></div>`:""}</div>`;
}
function renderHead(){$("headNote").textContent=`${allPlaces().filter(p=>!p.hidden).length} 個地方・已去過 ${S.visited.length} 個・完成 ${doneTrips().length} 趟旅行`}
function renderDraw(anim){
  if(S.area==null||S.main==null||!P(S.main)) draw();
  renderCond();renderVote();renderHead();
  $("goBtn").disabled=S.area==null;
  if(S.area==null){$("ticket").innerHTML=`<div class="t-body"><div class="empty"><p>${esc(drawMsg)}</p><button type="button" class="btn" id="unlockAll">${I("unlock")}解除全部鎖定再抽</button></div></div>`;$("drawNote").textContent="";$("out").value="";return}
  const a=AREAS[S.area],th=THEMES[S.theme],pl=PLANS[S.plan];
  const aOpts=AREAS.map((x,i)=>`<option value="${i}" ${i===S.area?"selected":""}>${x.name}</option>`).join("");
  const tOpts=THEMES.map((x,i)=>`<option value="${i}" ${i===S.theme?"selected":""}>${x.name}</option>`).join("");
  const bOpts=PLANS.map((x,i)=>`<option value="${i}" ${i===S.plan?"selected":""}>${x.name}</option>`).join("");
  $("ticket").innerHTML=`<div class="stub"><span class="stub-t">週末車票・${esc(a.name)}</span><span class="stub-no">No.${String(S.trips.length+1).padStart(3,"0")}</span></div><div class="t-body"><p class="t-legend" aria-hidden="true"><span>${I("shuffle")}換一個</span><span>${I("unlock")}鎖住不換</span><span>${I("list")}自己選</span></p>${trow("area","區域",a.name,isTaipei()?`從${S.set.home}出發約 ${fmtHr(a.hr)}`:"",aOpts)}${trow("theme","主題",th.name,th.desc,tOpts)}${trow("plan","預算時間",pl.name,pl.budget,bOpts)}<div class="spots">${spotHTML(P(S.main),"主要景點")}${spotHTML(S.side?P(S.side):null,"搭配景點")}${spotHTML(S.rain?P(S.rain):null,"雨天備案")}</div><div class="t-foot"><button type="button" class="btn btn-ghost" id="reSpot">${I("shuffle")}只換景點</button></div></div>`;
  if(anim&&!RM()){const el=$("ticket");el.classList.remove("drawn");void el.offsetWidth;el.classList.add("drawn")}
  const dt=doneTrips().length;
  $("drawNote").textContent=drawMsg||(S.prefer&&dt<2?"評分過 2 趟以上，「依全家喜好推薦」才會開始有效果。":"");
  $("outChips").innerHTML=OUTS.map((x,i)=>`<button type="button" class="chip" aria-pressed="${S.out===i}" data-out="${i}">${I("check","chk")}${x}</button>`).join("");
  $("out").value=buildOut(S.out);
  if(!$("goDate").value)$("goDate").value=nextSat();
}
$("drawBtn").onclick=()=>{draw();pickOpen=null;save();renderDraw(true)};
function toggleMark(id,k){const m={...mk(id)};m[k]=!m[k];if(!m.s&&!m.h)delete S.marks[id];else S.marks[id]={...(m.s?{s:true}:{}),...(m.h?{h:true}:{})};save()}
$("ticket").addEventListener("click",e=>rf(()=>{
  if(e.target.closest("#unlockAll")){S.lock={area:false,theme:false,plan:false};draw();save();renderDraw(true);return "#drawBtn"}
  const mb=e.target.closest("[data-mk]");if(mb){toggleMark(mb.dataset.mk,mb.dataset.k);renderDraw(false);return}
  if(e.target.closest("#reSpot")){const keep={...S.lock};S.lock={area:true,theme:true,plan:true};draw();S.lock=keep;save();renderDraw(true);return}
  const r=e.target.closest("[data-re]");if(r){const k=r.dataset.re;const keep={...S.lock};S.lock={area:true,theme:true,plan:true};S.lock[k]=false;if(k==="area")S.area=null;draw();S.lock=keep;save();renderDraw(true);return}
  const l=e.target.closest("[data-lock]");if(l){S.lock[l.dataset.lock]=!S.lock[l.dataset.lock];save();renderDraw(false);return}
  const p=e.target.closest("[data-pick]");if(p){pickOpen=pickOpen===p.dataset.pick?null:p.dataset.pick;renderDraw(false);return pickOpen?`#pick-${pickOpen}`:undefined}
}));
$("ticket").addEventListener("change",e=>{const s=e.target.closest("[data-sel]");if(!s)return;const k=s.dataset.sel;S[k]=+s.value;const keep={...S.lock};S.lock={area:true,theme:true,plan:true};draw();S.lock=keep;save();renderDraw(true);const again=document.querySelector(`[data-sel="${k}"]`);if(again)again.focus()});
$("outChips").addEventListener("click",e=>rf(()=>{const b=e.target.closest("[data-out]");if(!b)return;S.out=+b.dataset.out;save();renderDraw(false)}));
function copyText(t,ok,fail){try{navigator.clipboard.writeText(t).then(ok,fail)}catch(e){fail()}}
$("copyOut").onclick=()=>copyText($("out").value,()=>toast("已複製到剪貼簿。"),()=>{$("out").focus();$("out").select();toast("無法自動複製，已幫你選取全文，請手動複製。")});
$("goBtn").onclick=()=>{
  if(S.main==null||!P(S.main))return;
  S.trips.unshift({id:uid("t"),date:$("goDate").value||nextSat(),status:"plan",area:S.area,theme:S.theme,plan:S.plan,main:S.main,side:S.side,rain:S.rain,ratings:{},tags:[],note:""});
  save();renderDraw(false);
  $("goStatus").textContent=`已存進旅行紀錄：${P(S.main).name}。玩回來記得評分！`;
  toast(`已存進旅行紀錄：${P(S.main).name}`,{action:"去看看",icon:false,onAction:()=>go("trips")});
};

const WX_IC={any:"any",hot:"sun",rain:"rain",cool:"wind"};
function renderCond(){
  $("weatherChips").innerHTML=WEATHER.map(w=>`<button type="button" class="chip" data-wx="${w.id}" aria-pressed="${S.weather===w.id}">${I("check","chk")}${I(WX_IC[w.id])}${w.name}</button>`).join("");
  $("weatherNote").textContent={any:"不考慮天氣。",hot:"會優先抽山上涼爽、可以玩水、遮蔭多或室內的地方，少抽曝曬的戶外行程。",rain:"會優先抽雨天室內的主題和地方，戶外行程大幅減少。",cool:"天氣舒服，自然和放電行程會更常出現。"}[S.weather];
  $("seasonFirst").checked=S.seasonFirst;$("skipVisited").checked=S.skip;$("prefer").checked=S.prefer;$("markBoost").checked=S.markBoost;
  const m=new Date().getMonth()+1;const n=drawPlaces().filter(p=>inSeason(p,m)).length;
  $("seasonLbl").textContent=`當季優先（${m} 月有 ${n} 個地方正當季）`;
  $("markLbl").innerHTML=`標註${I("star","i-sm")}${I("heart","i-sm")}的景點優先（已標註 ${Object.keys(S.marks).length} 個）`;
  const w=WEATHER.find(x=>x.id===S.weather);const bits=[w.id==="any"?"天氣不限":w.name];
  if(S.seasonFirst)bits.push("當季優先");if(S.skip)bits.push("跳過去過");if(S.prefer)bits.push("依喜好");if(S.markBoost)bits.push("標註優先");
  $("condSum").textContent=bits.join("・");
}
$("weatherChips").addEventListener("click",e=>rf(()=>{const b=e.target.closest("[data-wx]");if(!b)return;S.weather=b.dataset.wx;save();renderCond()}));
$("seasonFirst").onchange=()=>{S.seasonFirst=$("seasonFirst").checked;save();renderCond()};
$("skipVisited").onchange=()=>{S.skip=$("skipVisited").checked;save();renderCond()};
$("prefer").onchange=()=>{S.prefer=$("prefer").checked;save();renderCond();const dt=doneTrips().length;$("drawNote").textContent=drawMsg||(S.prefer&&dt<2?"評分過 2 趟以上，「依全家喜好推薦」才會開始有效果。":"")};
$("markBoost").onchange=()=>{S.markBoost=$("markBoost").checked;save();renderCond()};

function snap(){return {area:S.area,theme:S.theme,plan:S.plan,main:S.main,side:S.side,rain:S.rain}}
$("voteBtn").onclick=()=>{
  const keep=snap();const cands=[];const used=new Set();
  for(let k=0;k<3;k++){let g=0;do{draw()}while(S.area!=null&&used.has(S.main)&&g++<6);if(S.area==null)break;if(!used.has(S.main)){cands.push(snap());used.add(S.main)}}
  Object.assign(S,keep);
  if(cands.length<2){$("voteStatus").textContent="符合條件的地方太少，抽不出三張。試試解除鎖定或在「抽籤條件」放寬設定。";return}
  S.vote={cands,votes:{}};save();renderVote();$("voteStatus").textContent="每個人點自己的名字，投給最想去的那張，一人一票。";
};
$("voteClear").onclick=()=>{S.vote={cands:[],votes:{}};save();renderVote();$("voteStatus").textContent="";$("voteBtn").focus()};
function tally(){const t=S.vote.cands.map(()=>0);Object.values(S.vote.votes).forEach(i=>{if(t[i]!=null)t[i]++});return t}
function renderVote(){
  const C=S.vote.cands;$("voteClear").hidden=!C.length;
  if(!C.length){$("voteGrid").innerHTML="";return}
  const t=tally();const max=Math.max(...t);const leaders=t.filter(x=>x===max).length;
  const voted=Object.keys(S.vote.votes).filter(id=>S.set.members.some(m=>m.id===id)).length;
  const all=voted===S.set.members.length;
  $("voteGrid").innerHTML=C.map((c,i)=>{const m=P(c.main),sd=c.side?P(c.side):null;const lead=max>0&&t[i]===max;const L=String.fromCharCode(65+i);
    return `<div class="vcard card ${lead?"is-lead":""}">${lead&&leaders===1&&all?`<span class="crown">${I("crown")}全家決定</span>`:""}<div class="vh"><h3>${L}．${esc(AREAS[c.area].name)}・${m?marksHTML(m.id):""}${esc(m?m.name:"")}</h3><span class="cnt">${t[i]} 票</span></div><p class="vs">${THEMES[c.theme].name}・${PLANS[c.plan].name}${sd?`<br>搭配：<strong>${esc(sd.name)}</strong>`:""}${m&&inSeason(m)?"<br>正當季":""}</p><div class="chips" role="group" aria-label="投給 ${L} 的人">${S.set.members.map(x=>`<button type="button" class="chip" data-vote="${x.id}|${i}" aria-pressed="${S.vote.votes[x.id]===i}">${I("check","chk")}${esc(x.name)}</button>`).join("")}</div><div class="row"><button type="button" class="btn ${lead?"btn-secondary":""}" data-take="${i}">就選這張</button></div></div>`}).join("");
  if(all&&max>0) $("voteStatus").textContent=leaders===1?`全家都投完了！最高票是 ${String.fromCharCode(65+t.indexOf(max))}。按「就選這張」看完整行程。`:"平手了！可以再討論一下，或讓最近沒選到的人決定。";
}
$("voteGrid").addEventListener("click",e=>rf(()=>{
  const v=e.target.closest("[data-vote]");if(v){const [mid,i]=v.dataset.vote.split("|");if(S.vote.votes[mid]===+i)delete S.vote.votes[mid];else S.vote.votes[mid]=+i;save();renderVote();return}
  const tk=e.target.closest("[data-take]");if(tk){Object.assign(S,S.vote.cands[+tk.dataset.take]);S.vote={cands:[],votes:{}};pickOpen=null;save();renderDraw(true);renderVote();$("voteStatus").textContent="已換成這張車票，上方是完整行程。";scrollToEl($("ticket"));$("ticket").focus({preventScroll:true});return "#ticket"}
}));

/* ---------- 旅行紀錄 ---------- */
let rateOpen=null,draftR=null,draftInit="",closeArm=false;
function tripTitleHTML(t){const m=P(t.main);return `${esc(AREAS[t.area]?AREAS[t.area].name:"")}・${m?marksHTML(m.id):""}${esc(m?m.name:"（已刪除的地點）")}`}
function keepDraft(){if(!draftR)return;const n=document.getElementById("rNote");if(n)draftR.note=n.value;const v=document.getElementById("rVisit");if(v)draftR.visit=v.checked}
function renderTrips(){
  const L=S.trips;
  $("tripList").innerHTML=L.length?L.map(t=>{
    const sd=t.side?P(t.side):null;const avg=tripAvg(t);const done=t.status==="done";
    let body=`<li class="trip card"><div class="top"><h3>${tripTitleHTML(t)}</h3><span class="st ${done?"done":"plan"}">${I(done?"check":"clock")}${done?"已評分":"計畫中"}</span></div><p class="meta">${esc(t.date)}・${THEMES[t.theme]?THEMES[t.theme].name:""}・${PLANS[t.plan]?PLANS[t.plan].name:""}${sd?`・搭配 ${esc(sd.name)}`:""}${done&&avg?`<br>全家平均 ${avg.toFixed(1)} 分・`+S.set.members.filter(x=>t.ratings[x.id]).map(x=>`${esc(x.name)} ${int(t.ratings[x.id],1,5,"")}`).join("、"):""}${t.tags&&t.tags.length?"<br>"+t.tags.map(esc).join("、"):""}${t.note?"<br>"+esc(t.note):""}</p>`;
    if(rateOpen!==t.id) body+=`<div class="row">${!done?`<button type="button" class="btn btn-secondary" data-rate="${t.id}">${I("star")}玩回來了，評分</button><button type="button" class="btn" data-redo="${t.id}">看行程</button><button type="button" class="btn btn-ghost" data-cancel="${t.id}">${I("x")}取消這趟</button>`:`<button type="button" class="btn" data-rate="${t.id}">${I("edit")}修改評分</button><button type="button" class="btn" data-redo="${t.id}">再看一次行程</button>`}</div>`;
    if(rateOpen===t.id&&draftR){
      body+=`<div class="rate-form" role="group" aria-label="替這趟旅行評分"><p class="help">每個人分開打分，1 到 5 顆星。再點一次同一顆星可以取消。</p>${S.set.members.map(x=>{const v=draftR.ratings[x.id]||0;return `<div class="mem-rate"><span class="who" id="who-${x.id}">${esc(x.name)}</span><div class="stars" role="group" aria-labelledby="who-${x.id}">${[1,2,3,4,5].map(n=>`<button type="button" class="icon-btn ${v>=n?"on":""}" data-star="${x.id}|${n}" aria-pressed="${v===n}" aria-label="${n} 顆星">${I("star")}</button>`).join("")}</div><span class="status">${v?v+" 顆星":"未評分"}</span></div>`}).join("")}
      <p class="err" id="rErr" role="alert"></p>
      <fieldset><legend>哪裡好</legend><div class="chips">${TAGS_GOOD.map(g=>`<button type="button" class="chip chip-good" data-tg="${esc(g)}" aria-pressed="${draftR.tags.includes(g)}">${I("check","chk")}${esc(g)}</button>`).join("")}</div></fieldset>
      <fieldset><legend>哪裡不好</legend><div class="chips">${TAGS_BAD.map(g=>`<button type="button" class="chip chip-bad" data-tg="${esc(g)}" aria-pressed="${draftR.tags.includes(g)}">${I("check","chk")}${esc(g)}</button>`).join("")}</div></fieldset>
      <div class="field"><label class="label" for="rNote">一句話記下這趟旅行（選填）</label><input class="input" id="rNote" maxlength="120" autocomplete="off" value="${esc(draftR.note||"")}"></div>
      <label class="check"><input type="checkbox" id="rVisit" ${draftR.visit?"checked":""}> <span>把這趟去的景點標記為「去過」</span></label>
      <div class="row"><button type="button" class="btn btn-primary" data-save="${t.id}">${I("check")}完成評分</button><button type="button" class="btn btn-ghost" data-close="1">${closeArm?"確定放棄這次評分？再按一次":"先不要"}</button></div></div>`;
    }
    return body+"</li>";
  }).join(""):`<li class="empty"><p>還沒有旅行紀錄。抽一張車票，按「就去這趟！」就會出現在這裡。</p><button type="button" class="btn btn-primary" data-goto="draw">${I("ticket")}去抽一張車票</button></li>`;
  renderPref();
}
$("tripList").addEventListener("click",e=>rf(()=>{
  const g=e.target.closest("[data-goto]");if(g){go(g.dataset.goto);return "#h-"+g.dataset.goto}
  const r=e.target.closest("[data-rate]");if(r){const t=S.trips.find(x=>x.id===r.dataset.rate);if(!t)return;rateOpen=t.id;draftR={ratings:{...t.ratings},tags:[...(t.tags||[])],note:t.note||"",visit:true};draftInit=JSON.stringify(draftR);closeArm=false;renderTrips();return "[data-star]"}
  const st=e.target.closest("[data-star]");if(st){keepDraft();const [mid,n]=st.dataset.star.split("|");draftR.ratings[mid]=draftR.ratings[mid]===+n?0:+n;closeArm=false;renderTrips();return}
  const tg=e.target.closest("[data-tg]");if(tg){keepDraft();const x=tg.dataset.tg;draftR.tags=draftR.tags.includes(x)?draftR.tags.filter(y=>y!==x):draftR.tags.concat(x);closeArm=false;renderTrips();return}
  if(e.target.closest("[data-close]")){keepDraft();const id=rateOpen;if(!closeArm&&JSON.stringify(draftR)!==draftInit){closeArm=true;renderTrips();return}rateOpen=null;draftR=null;closeArm=false;renderTrips();return `[data-rate="${id}"]`}
  const sv=e.target.closest("[data-save]");if(sv){const t=S.trips.find(x=>x.id===sv.dataset.save);keepDraft();
    const rt=Object.fromEntries(Object.entries(draftR.ratings).filter(([,v])=>v>0));
    if(!Object.keys(rt).length){setErr(null,"rErr","至少要有一個人打分數：點名字旁邊的星星。");return "[data-star]"}
    t.ratings=rt;t.tags=draftR.tags;t.note=String(draftR.note||"").trim().slice(0,120);t.status="done";
    if(draftR.visit)[t.main,t.side].filter(Boolean).forEach(id=>{if(!S.visited.includes(id))S.visited.push(id)});
    rateOpen=null;draftR=null;closeArm=false;save();renderTrips();renderHead();toast("已完成評分，全家喜好也更新了。");return `[data-rate="${t.id}"]`}
  const c=e.target.closest("[data-cancel]");if(c){const sn=snapshot();const t=S.trips.find(x=>x.id===c.dataset.cancel);S.trips=S.trips.filter(x=>x.id!==c.dataset.cancel);save();renderTrips();toast(`已取消：${t?tripTitleText(t):"這趟旅行"}`,{action:"復原",onAction:()=>restore(sn,"已復原這趟旅行。")});return "#h-trips"}
  const d=e.target.closest("[data-redo]");if(d){const t=S.trips.find(x=>x.id===d.dataset.redo);Object.assign(S,{area:t.area,theme:t.theme,plan:t.plan,main:t.main,side:t.side,rain:t.rain});S.out=0;pickOpen=null;save();scrollMem.draw=0;go("draw");return "#h-draw"}
}));
function tripTitleText(t){const m=P(t.main);return `${AREAS[t.area]?AREAS[t.area].name:""}・${m?m.name:"（已刪除的地點）"}`}
function bars(rows,fmt){const max=Math.max(...rows.map(r=>r.v),1);return rows.map((r,i)=>`<div class="ana-row ${i===0?"top":""}"><span class="k">${esc(r.k)}</span><span class="b" aria-hidden="true"><i style="width:${Math.max(4,r.v/max*100)}%"></i></span><span class="v">${fmt(r)}</span></div>`).join("")}
function renderPref(){
  const D=doneTrips();
  if(D.length<2){$("prefBox").innerHTML=`<p class="help">評分完 2 趟旅行後，這裡會開始分析全家人各自喜歡什麼。目前完成 ${D.length} 趟。</p>`;return}
  let html="";
  const fam=Object.entries(themeScores(null)).map(([k,v])=>({k:TH(k).name,v:v.avg,n:v.n})).sort((a,b)=>b.v-a.v);
  html+=`<h3>全家最喜歡的主題</h3>`+bars(fam,r=>`${r.v.toFixed(1)} 分・${r.n} 趟`);
  html+=`<h3>每個人的口味</h3><div class="mem-grid">`+S.set.members.map(m=>{const sc=Object.entries(themeScores(m.id)).filter(([,v])=>v.n>=1).sort((a,b)=>b[1].avg-a[1].avg);if(!sc.length)return `<div class="mem-card"><b>${esc(m.name)}</b>還沒有評分</div>`;const best=sc[0],worst=sc[sc.length-1];return `<div class="mem-card"><b>${esc(m.name)}</b>最愛「${TH(best[0]).name}」（${best[1].avg.toFixed(1)} 分）${sc.length>1&&worst[1].avg<best[1].avg?`，最不感興趣「${TH(worst[0]).name}」（${worst[1].avg.toFixed(1)} 分）`:""}</div>`}).join("")+`</div>`;
  const allLove=Object.keys(themeScores(null)).filter(k=>S.set.members.every(m=>{const s=themeScores(m.id)[k];return s&&s.avg>=4}));
  if(allLove.length) html+=`<p class="insight">全家人都給 4 分以上的主題：${allLove.map(k=>TH(k).name).join("、")}。下次可以鎖定這個主題，保證大家都開心。</p>`;
  const ar={};D.forEach(t=>{const a=AREAS[t.area];if(!a)return;(ar[a.name]=ar[a.name]||[]).push(tripAvg(t))});
  const arows=Object.entries(ar).map(([k,a])=>({k,v:a.reduce((p,c)=>p+c,0)/a.length,n:a.length})).sort((a,b)=>b.v-a.v);
  if(arows.length>1) html+=`<h3>區域</h3>`+bars(arows,r=>`${r.v.toFixed(1)} 分・${r.n} 趟`);
  const tc={};D.forEach(t=>(t.tags||[]).forEach(x=>tc[x]=(tc[x]||0)+1));
  const good=Object.entries(tc).filter(([k])=>TAGS_GOOD.includes(k)).sort((a,b)=>b[1]-a[1]);
  const bad=Object.entries(tc).filter(([k])=>TAGS_BAD.includes(k)).sort((a,b)=>b[1]-a[1]);
  if(good.length) html+=`<h3>旅行的好時光</h3>`+bars(good.map(([k,n])=>({k,v:n})),r=>`${r.v} 次`);
  if(bad.length) html+=`<h3>常見的小抱怨</h3>`+bars(bad.map(([k,n])=>({k,v:n})),r=>`${r.v} 次`);
  const tips=[];
  if((tc["走太多路"]||0)>=2&&S.set.walk>1) tips.push(`「走太多路」出現 ${tc["走太多路"]} 次，要不要把步行上限調低一級？<button type="button" class="btn" id="lowerWalk">調低步行上限</button>`);
  if((tc["交通太久"]||0)>=2) tips.push(`「交通太久」出現 ${tc["交通太久"]} 次，可以多抽「半天」或車程短的區域。`);
  if((tc["太熱"]||0)>=2) tips.push(`「太熱」出現 ${tc["太熱"]} 次，天氣熱時可以鎖定「雨天室內」，或選山上比較涼爽的地方。`);
  if((tc["人太多"]||0)>=2) tips.push(`「人太多」出現 ${tc["人太多"]} 次，熱門景點可以改成一早出發，或改在連假以外的週末去。`);
  if(tips.length) html+=`<h3>下次可以這樣調整</h3>`+tips.map(x=>`<p class="insight">${x}</p>`).join("");
  html+=`<p class="help" style="margin-top:var(--sp-3)">在抽籤條件打開「依全家喜好推薦」，評分高的主題會比較常被抽到。</p>`;
  $("prefBox").innerHTML=html;
}
$("prefBox").addEventListener("click",e=>{if(e.target.closest("#lowerWalk")){S.set.walk=Math.max(1,S.set.walk-1);save();renderPref();toast(`步行上限已調成「${WALK[S.set.walk]}」。`);$("h-pref").focus({preventScroll:true})}});

/* ---------- 設定 ---------- */
function renderSet(){
  if(document.activeElement!==$("home"))$("home").value=S.set.home;
  $("homeNote").textContent=isTaipei()?"車程會以台北出發估算。":"出發地不是台北時，不會顯示車程，也不限制區域距離。";
  const one=S.set.members.length<=1,full=S.set.members.length>=8;
  $("memEd").innerHTML=S.set.members.map((m,i)=>`<div class="mem-row"><input class="input" data-mn="${i}" value="${esc(m.name)}" maxlength="10" autocomplete="off" aria-label="第 ${i+1} 位成員的名字"><input class="input" data-ma="${i}" value="${esc(m.age)}" maxlength="3" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="第 ${i+1} 位成員的年齡（選填）"><button type="button" class="icon-btn" data-md="${i}" aria-label="刪除成員：${esc(m.name)}" title="${one?"至少要保留一位成員":"刪除"}" ${one?"disabled":""}>${I("trash")}</button></div>`).join("");
  $("addMem").disabled=full;$("memMax").textContent=full?"最多 8 位成員。":"";
  $("walkChips").innerHTML=[1,2,3].map(n=>`<button type="button" class="chip" data-w="${n}" aria-pressed="${S.set.walk===n}">${I("check","chk")}${WALK[n]}</button>`).join("");
  $("transChips").innerHTML=[["car","開車"],["public","大眾運輸"]].map(([v,n])=>`<button type="button" class="chip" data-tr="${v}" aria-pressed="${S.set.trans===v}">${I("check","chk")}${n}</button>`).join("");
}
const homeNoteLater=debounce(()=>{$("homeNote").textContent=isTaipei()?"車程會以台北出發估算。":"出發地不是台北時，不會顯示車程，也不限制區域距離。"},200);
$("home").oninput=()=>{S.set.home=$("home").value.trim()||"台北";save();homeNoteLater()};
$("memEd").addEventListener("input",e=>{const el=e.target;if(el.dataset.mn!=null)S.set.members[+el.dataset.mn].name=el.value.trim().slice(0,10)||"成員";if(el.dataset.ma!=null){const v=el.value.replace(/\D/g,"").slice(0,3);if(v!==el.value)el.value=v;S.set.members[+el.dataset.ma].age=v}save()});
$("memEd").addEventListener("change",()=>renderSet());
$("memEd").addEventListener("click",e=>rf(()=>{const d=e.target.closest("[data-md]");if(!d||S.set.members.length<=1)return;const i=+d.dataset.md;const sn=snapshot();const name=S.set.members[i].name;S.set.members.splice(i,1);save();renderSet();toast(`已刪除成員：${name}`,{action:"復原",onAction:()=>restore(sn,"已復原成員。")});return i>=S.set.members.length?"#addMem":undefined}));
$("addMem").onclick=()=>{if(S.set.members.length>=8)return;S.set.members.push({id:uid("m"),name:"成員"+(S.set.members.length+1),age:""});save();renderSet();const ins=document.querySelectorAll("[data-mn]");const last=ins[ins.length-1];if(last&&last.focus){last.focus();last.select&&last.select()}};
$("walkChips").addEventListener("click",e=>rf(()=>{const b=e.target.closest("[data-w]");if(!b)return;S.set.walk=+b.dataset.w;save();renderSet()}));
$("transChips").addEventListener("click",e=>rf(()=>{const b=e.target.closest("[data-tr]");if(!b)return;S.set.trans=b.dataset.tr;save();renderSet()}));

/* ---------- 景點庫 ---------- */
let spotF="all",areaF="all",spotLimit=40,editId=null,nameTouched=false,formInit=false;
const SPOT_F=[["all","全部景點"],["s","有星星的"],["h","有愛心的"],["v","去過的"],["nv","還沒去的"],["mine","我新增的"],["new","最新熱點"],["ok","近期查證過的"],["pause","暫停開放的"],["ed","我修改過的"],["gone","已刪除的"]];
const FORM_NOTE='把你喜歡的地方加進景點庫，抽籤時會一起出現。標 <span class="req" aria-hidden="true">*</span> 的欄位必填。';
function initSpotsForm(){
  if(formInit)return;formInit=true;
  $("spotF").innerHTML=SPOT_F.map(([v,n])=>`<option value="${v}">${n}</option>`).join("");
  $("areaF").innerHTML=`<option value="all">全部區域</option>`+AREAS.map(a=>`<option value="${esc(a.name)}">${esc(a.name)}</option>`).join("");
  $("pArea").innerHTML=AREAS.map(a=>`<option value="${esc(a.name)}">${esc(a.name)}</option>`).join("");
  const mo='<option value="">不限</option>'+range(12).map(i=>`<option value="${i+1}">${i+1} 月</option>`).join("");$("pS1").innerHTML=mo;$("pS2").innerHTML=mo;
  $("pThemes").innerHTML=THEMES.map(t=>`<label class="chip"><input type="checkbox" value="${t.id}">${I("check","chk")}${t.name}</label>`).join("");
}
function spotItem(p){
  const m=mk(p.id),v=S.visited.includes(p.id);
  const badges=(v?`<span class="badge ok">${I("check")}去過</span>`:"")+(p.mine?'<span class="badge e">我新增的</span>':"")+(NEWSET.has(p.id)?`<span class="badge hot">${NEW_LABEL}</span>`:"")+statusHTML(p,"span")+(p.edited?'<span class="badge e">已修改</span>':"")+(p.edited&&p.stale?`<span class="badge warn">${I("info")}官方資料有更新</span>`:"")+verifiedHTML(p,"span")+(inSeason(p)?'<span class="badge hot">正當季</span>':"");
  const ops=p.hidden?`<button type="button" class="btn" data-restore="${p.id}">${I("undo")}還原這個景點</button>`
    :`${markBtns(p)}<button type="button" class="btn vis" data-vis="${p.id}" aria-pressed="${v}">${v?I("check"):""}去過</button><a class="icon-btn" href="${mapURL(p)}" target="_blank" rel="noopener" aria-label="在 Google 地圖上看${esc(p.name)}（開新視窗）" title="在地圖上看">${I("map")}</a><details class="more push"><summary class="icon-btn" aria-label="更多操作：${esc(p.name)}" title="更多操作">${I("more")}</summary><div class="menu"><button type="button" class="btn" data-edit="${p.id}">${I("edit")}編輯資料</button>${p.edited?`<button type="button" class="btn" data-reset="${p.id}">${I("undo")}${p.stale?"改用官方最新資料":"還原原始資料"}</button>`:""}${fbLink(p,"btn")}<div class="sep" role="separator"></div><button type="button" class="btn danger" data-del="${p.id}">${I("trash")}刪除這個景點</button></div></details>`;
  return `<li class="si card ${p.hidden?"gone":""}"><div class="si-head">${marksHTML(p.id)}<h3>${esc(p.name)}</h3>${badges}</div><p class="si-meta">${esc(p.area)}・${p.t.map(x=>TH(x).name).join("、")}・步行${WALK[p.walk]}・${DUR[p.dur]}${p.season?"・"+seasonLabel(p):""}</p>${p.note?`<p class="si-meta">${esc(p.note)}</p>`:""}<div class="si-ops">${ops}</div></li>`;
}
function renderSpots(){
  initSpotsForm();
  const all=allPlaces();const live=all.filter(p=>!p.hidden);
  const ns=Object.values(S.marks).filter(m=>m.s).length,nh=Object.values(S.marks).filter(m=>m.h).length;
  const nPause=live.filter(p=>!isOpen(p)).length;
  $("spotSum").textContent=`共 ${live.length} 個景點（資料版本 ${DATA.dataVersion}），${live.filter(isFresh).length} 個在近 4 個月內上網查證過，${live.filter(p=>NEWSET.has(p.id)).length} 個是近期新增的最新熱點${nPause?`，${nPause} 個暫停開放`:""}。我新增 ${S.custom.length}・修改 ${Object.keys(S.edits).length}・刪除 ${S.hidden.length}・星星 ${ns}・愛心 ${nh}・去過 ${S.visited.length}`;
  $("spotF").value=spotF;$("areaF").value=areaF;
  const q=$("spotQ").value.trim().toLowerCase();
  const list=all.filter(p=>{
    if(spotF==="gone")return p.hidden; if(p.hidden)return false;
    if(spotF==="s"&&!mk(p.id).s)return false; if(spotF==="h"&&!mk(p.id).h)return false;
    if(spotF==="v"&&!S.visited.includes(p.id))return false; if(spotF==="nv"&&S.visited.includes(p.id))return false;
    if(spotF==="mine"&&!p.mine)return false; if(spotF==="ok"&&!isFresh(p))return false; if(spotF==="ed"&&!p.edited)return false; if(spotF==="new"&&!NEWSET.has(p.id))return false; if(spotF==="pause"&&isOpen(p))return false;
    if(areaF!=="all"&&p.area!==areaF)return false;
    if(q&&!(p.name+p.area+(p.note||"")).toLowerCase().includes(q))return false;
    return true;
  }).sort((a,b)=>{const sa=(mk(a.id).s?2:0)+(mk(a.id).h?2:0),sb=(mk(b.id).s?2:0)+(mk(b.id).h?2:0);return sb-sa});
  const shown=list.slice(0,spotLimit);
  $("spotCount").textContent=`找到 ${list.length} 個${list.length>shown.length?`，先顯示 ${shown.length} 個`:""}`;
  const filtered=spotF!=="all"||areaF!=="all"||q;
  $("placeList").innerHTML=shown.length?shown.map(spotItem).join(""):`<li class="empty"><p>${spotF==="s"?"還沒有標上星星的景點。在景點旁點星星就能標註。":spotF==="h"?"還沒有標上愛心的景點。在景點旁點愛心就能標註。":spotF==="gone"?"沒有刪除的景點。":"找不到符合的景點，換個關鍵字或篩選條件試試。"}</p>${filtered?`<button type="button" class="btn" data-clearf="1">${I("x")}清除搜尋和篩選</button>`:""}</li>`;
  $("moreSpots").hidden=list.length<=spotLimit;$("moreSpots").textContent=`顯示更多（還有 ${list.length-spotLimit} 個）`;
}
$("spotQ").addEventListener("input",debounce(()=>{spotLimit=40;renderSpots()},180));
$("spotF").onchange=()=>{spotF=$("spotF").value;spotLimit=40;renderSpots()};
$("areaF").onchange=()=>{areaF=$("areaF").value;spotLimit=40;renderSpots()};
$("moreSpots").onclick=()=>{spotLimit+=60;renderSpots()};
function themesSel(){return [...$("pThemes").querySelectorAll("input:checked")].map(x=>x.value)}
function fillForm(p){
  $("pName").value=p?p.name:"";$("pArea").value=p?p.area:AREAS[0].name;
  $("pThemes").querySelectorAll("input").forEach(x=>x.checked=!!p&&p.t.includes(x.value));
  $("pDur").value=p?p.dur:1;$("pWalk").value=p?p.walk:1;$("pCost").value=p?p.cost:0;$("pKid").checked=p?p.kid:true;$("pNote").value=p?p.note||"":"";
  const [a,b]=p&&p.season?p.season.split("-"):["",""];$("pS1").value=a;$("pS2").value=b;
  nameTouched=false;setErr("pName","pNameErr","");setErr(null,"pThemesErr","");
}
function endEdit(){editId=null;fillForm(null);$("formHT").textContent="新增景點";$("formNote").innerHTML=FORM_NOTE;$("pSubmitT").textContent="加入景點庫";$("pCancel").hidden=true}
document.addEventListener("click",e=>{document.querySelectorAll("details.more[open]").forEach(d=>{if(!d.contains(e.target))d.open=false})});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){const d=document.querySelector("details.more[open]");if(d){d.open=false;const s=d.querySelector("summary");if(s)s.focus()}}});
$("placeList").addEventListener("click",e=>rf(()=>{
  if(e.target.closest("[data-clearf]")){spotF="all";areaF="all";$("spotQ").value="";spotLimit=40;renderSpots();return "#spotQ"}
  const t=e.target.closest("[data-mk],[data-vis],[data-edit],[data-reset],[data-del],[data-restore]");if(!t)return;
  if(t.dataset.mk){toggleMark(t.dataset.mk,t.dataset.k);renderSpots();return}
  if(t.dataset.vis){const id=t.dataset.vis;S.visited=S.visited.includes(id)?S.visited.filter(x=>x!==id):S.visited.concat(id);save();renderSpots();renderHead();return}
  if(t.dataset.edit){const p=P(t.dataset.edit);if(!p)return;renderSpots();editId=p.id;fillForm(p);$("formHT").textContent=`編輯：${p.name}`;$("formNote").textContent=p.mine?"修改你新增的景點。":"修改內建景點的資料，之後隨時可以在「更多操作」裡還原原始資料。";$("pSubmitT").textContent="儲存修改";$("pCancel").hidden=false;scrollToEl($("formSec"));return "#pName"}
  const sn=snapshot();
  if(t.dataset.reset){const p=P(t.dataset.reset);delete S.edits[t.dataset.reset];save();renderSpots();toast(`已還原「${p?BUILT.find(b=>b.id===p.id).name:""}」的原始資料。`,{action:"復原",onAction:()=>restore(sn)});return "#spotQ"}
  if(t.dataset.restore){const p=P(t.dataset.restore);S.hidden=S.hidden.filter(x=>x!==t.dataset.restore);save();renderSpots();renderHead();toast(`已把「${p?p.name:""}」放回景點庫。`);return "#spotQ"}
  if(t.dataset.del){
    const id=t.dataset.del;const p=P(id);
    if(p&&p.mine){S.custom=S.custom.filter(x=>x.id!==id);S.visited=S.visited.filter(x=>x!==id);delete S.marks[id]}
    else if(!S.hidden.includes(id))S.hidden.push(id);
    if(editId===id)endEdit();
    if([S.main,S.side,S.rain].includes(id))S.main=null;
    save();renderSpots();renderHead();
    toast(`已刪除「${p?p.name:""}」。`,{action:"復原",onAction:()=>restore(sn,"已復原刪除的景點。")});
    return "#spotQ";
  }
}));
$("pCancel").onclick=()=>{endEdit();$("pName").focus()};
$("pName").addEventListener("input",()=>{nameTouched=true;if($("pName").value.trim())setErr("pName","pNameErr","")});
$("pName").addEventListener("blur",()=>{if(nameTouched&&!$("pName").value.trim())setErr("pName","pNameErr","請填地點名稱，例如「某某森林步道」。")});
$("pThemes").addEventListener("change",()=>{if(themesSel().length)setErr(null,"pThemesErr","")});
$("placeForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("pName").value.trim();const t=themesSel();
  const s1=$("pS1").value,s2=$("pS2").value;
  const data={name,area:$("pArea").value,t,dur:+$("pDur").value,walk:+$("pWalk").value,cost:+$("pCost").value,kid:$("pKid").checked,note:$("pNote").value.trim(),season:s1&&s2?`${s1}-${s2}`:s1?`${s1}-${s1}`:s2?`${s2}-${s2}`:""};
  let nameErr=!name?"請填地點名稱，例如「某某森林步道」。":"";
  if(!nameErr&&allPlaces().some(p=>!p.hidden&&p.id!==editId&&p.name===name&&p.area===data.area))nameErr=`「${name}」已經在${data.area}的景點庫裡了。換個名字，或到列表裡直接編輯它。`;
  const themeErr=t.length?"":"至少選一個主題，抽籤時才找得到它。";
  setErr("pName","pNameErr",nameErr);setErr(null,"pThemesErr",themeErr);
  if(nameErr){$("pName").focus();return}
  if(themeErr){const f=$("pThemes").querySelector("input");if(f)f.focus();return}
  const sn=snapshot();
  if(editId){
    const p=P(editId);
    if(p&&p.mine){Object.assign(S.custom.find(x=>x.id===editId),data)}
    else if(p){S.edits[editId]={...data,rev:BASE(editId).rev}}
    save();renderSpots();endEdit();
    toast(`已儲存「${name}」的修改。`,{action:"復原",onAction:()=>restore(sn)});
    if(p&&[S.main,S.side,S.rain].includes(p.id))renderDraw(false);
    return;
  }
  if(S.custom.length>=200){setErr("pName","pNameErr","最多可以新增 200 個景點，可以先刪掉不需要的再新增。");$("pName").focus();return}
  S.custom.push({id:uid("u"),...data,fl:""});
  fillForm(null);save();renderSpots();renderHead();
  toast(`已加入「${name}」，抽籤時會一起出現。`,{action:"復原",onAction:()=>restore(sn,"已取消新增。")});
  $("pName").focus();
});

/* ---------- 備份 ---------- */
const b64e=s=>btoa(unescape(encodeURIComponent(s)));const b64d=s=>decodeURIComponent(escape(atob(s.replace(/\s/g,""))));
$("exportBtn").onclick=()=>{const code="TRIP1:"+b64e(JSON.stringify({set:S.set,custom:S.custom,visited:S.visited,trips:S.trips,marks:S.marks,hidden:S.hidden,edits:S.edits}));copyText(code,()=>toast("已複製備份碼，請貼到安全的地方保存。"),()=>{$("importBox").value=code;$("importBox").focus();$("importBox").select();toast("無法自動複製，備份碼已放進下方框框並選取好了。")})};
let impArmed=false,impTimer=null;
const IMP_T="匯入並取代目前資料";
$("importBox").addEventListener("input",()=>setErr("importBox","importErr",""));
$("importBtn").onclick=()=>{
  const raw=$("importBox").value.trim();let d=null;
  try{if(!raw.startsWith("TRIP1:"))throw 0;d=JSON.parse(b64d(raw.slice(6)));if(!d||!d.set||!Array.isArray(d.trips))throw 0}
  catch(e){setErr("importBox","importErr",raw?"這不是小旅行籤的備份碼。備份碼要以 TRIP1: 開頭，請確認有完整貼上。":"請先把備份碼貼進上面的框框。");$("importBox").focus();return}
  setErr("importBox","importErr","");
  if(!impArmed){impArmed=true;$("importT").textContent="再按一次，確認取代";clearTimeout(impTimer);impTimer=setTimeout(()=>{impArmed=false;$("importT").textContent=IMP_T},5000);toast("匯入會取代這台裝置目前的成員、景點庫和旅行紀錄。確定的話請再按一次。");return}
  impArmed=false;clearTimeout(impTimer);$("importT").textContent=IMP_T;
  const sn=snapshot();
  Object.assign(S,cleanData(d));S.vote={cands:[],votes:{}};
  S.main=null;cleanState();save();renderSet();renderHead();$("importBox").value="";
  toast("匯入完成。",{action:"復原",onAction:()=>restore(sn,"已復原成匯入前的資料。")});
};

/* ---------- 導覽（含網址、返回鍵、捲動位置記憶） ---------- */
const TABS=["draw","spots","trips","set"];
const scrollMem={};
function showTab(t,opts){
  opts=opts||{};
  if(!TABS.includes(t))t="draw";
  const prev=S.tab;
  if(prev&&prev!==t)scrollMem[prev]=window.scrollY||0;
  S.tab=t;
  document.querySelectorAll("[data-panel]").forEach(el=>el.hidden=el.dataset.panel!==t);
  document.querySelectorAll(".nav [data-go]").forEach(b=>{if(b.dataset.go===t)b.setAttribute("aria-current","page");else if(b.removeAttribute)b.removeAttribute("aria-current")});
  if(t==="draw")renderDraw(false);if(t==="trips")renderTrips();if(t==="set")renderSet();if(t==="spots")renderSpots();
  if(prev!==t)window.scrollTo(0,scrollMem[t]||0);
  if(opts.focus){const h=$("h-"+t);if(h&&h.focus)h.focus({preventScroll:true})}
  if(opts.push){try{if(location.hash!=="#"+t)history.pushState(null,"","#"+t)}catch(e){}}
  save();
}
function go(t){showTab(t,{push:true,focus:true})}
function fromHash(){try{const h=(location.hash||"").slice(1);return TABS.includes(h)?h:null}catch(e){return null}}
window.addEventListener("popstate",()=>{const t=fromHash()||"draw";if(t!==S.tab)showTab(t,{focus:true})});
window.addEventListener("hashchange",()=>{const t=fromHash();if(t&&t!==S.tab)showTab(t,{focus:true})});
document.querySelectorAll(".nav [data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
function renderNews(){
  const show=S.seenData!==DATA.dataVersion&&!!LATEST.summary;$("newsCard").hidden=!show;if(!show)return;
  $("newsTitle").textContent=`景點資料更新了（${DATA.dataVersion}）`;$("newsText").textContent=LATEST.summary;
  $("newsNew").hidden=!(LATEST.added&&LATEST.added.length);
}
$("newsNew").onclick=()=>{S.seenData=DATA.dataVersion;spotF="new";save();renderNews();go("spots")};
$("newsOk").onclick=()=>{S.seenData=DATA.dataVersion;save();renderNews();$("drawBtn").focus()};
renderNews();
if(OFFLINE)toast(`目前連不上網路，先使用上次下載的景點資料（${DATA.dataVersion}）。`,{ms:6000});
initSpotsForm();endEdit();
{const start=fromHash()||S.tab||"draw";S.tab=null;showTab(start);try{history.replaceState(null,"","#"+S.tab)}catch(e){}}
}
})();
