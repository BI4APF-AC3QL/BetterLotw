const BAND_COLUMNS = ["160M", "80M", "60M", "40M", "30M", "20M", "17M", "15M", "12M", "10M", "6M", "2M", "70CM"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const STATUS_LABELS = { confirmed:"已确认", unconfirmed:"待确认", none:"无" };
const AWARD_LINKS = {
  dxcc:"https://www.arrl.org/dxcc", was:"https://www.arrl.org/was", vucc:"https://www.arrl.org/vucc",
  triple:"https://www.arrl.org/triple-play", waz:"https://cq-amateur-radio.com/cq_awards/cq_waz_awards/", wpx:"https://www.cqwpx.com/"
};

const $ = selector => document.querySelector(selector);
const h = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
const rawDxcc = Array.isArray(window.BETTERLOTW_DXCC) ? window.BETTERLOTW_DXCC : [];
const entityById = new Map();
const exactCallMap = new Map();
const prefixEntries = [];

rawDxcc.forEach(([id,name,cqz,lat,lon,continent,aliases]) => {
  if (!/^\d+$/.test(String(id)) || Number(id) <= 0) return;
  const entity = entityById.get(String(id)) || { id:String(id), name, cqz:String(cqz), lat:Number(lat), lon:Number(lon), continent, prefixes:[] };
  String(aliases || "").split(",").filter(Boolean).forEach(token => {
    const value = token.toUpperCase().trim();
    if (!value || /[-*]/.test(value)) return;
    if (value.startsWith("=")) exactCallMap.set(value.slice(1), entity);
    else if (/^[A-Z0-9/]+$/.test(value)) entity.prefixes.push(value);
  });
  entityById.set(String(id), entity);
});
const DXCC_CATALOG = [...entityById.values()].sort((a,b) => a.name.localeCompare(b.name, "zh-CN"));
DXCC_CATALOG.forEach(entity => [...new Set(entity.prefixes)].forEach(prefix => prefixEntries.push([prefix,entity])));
prefixEntries.sort((a,b) => b[0].length - a[0].length);

let awards = createAwards();
let currentQsos = [];
let currentConfirmed = [];
let selectedAwardId = "dxcc";
let selectedMode = "MIXED";
let selectedStatus = "all";
let lastCalculated = "尚未同步";
let currentMatrixRows = [];
let currentMapRows = [];
let pendingVisible = 80;
const mapView = { scale:1, x:0, y:0, dragging:false, startX:0, startY:0, originX:0, originY:0 };

const demoQsos = [
  {CALL:"JA1ABC",COUNTRY:"Japan",DXCC:"339",CQZ:"25",PFX:"JA1",GRIDSQUARE:"PM95",BAND:"20M",MODE:"FT8",QSL_RCVD:"Y",QSO_DATE:"20260831"},
  {CALL:"VK4XYZ",COUNTRY:"Australia",DXCC:"150",CQZ:"30",PFX:"VK4",GRIDSQUARE:"QG62",BAND:"15M",MODE:"SSB",QSL_RCVD:"Y",QSO_DATE:"20260830"},
  {CALL:"W1AW",COUNTRY:"United States",DXCC:"291",STATE:"CT",CQZ:"5",PFX:"W1",GRIDSQUARE:"FN31",BAND:"40M",MODE:"CW",QSL_RCVD:"Y",QSO_DATE:"20260828"},
  {CALL:"K6TEST",COUNTRY:"United States",DXCC:"291",STATE:"CA",CQZ:"3",PFX:"K6",GRIDSQUARE:"CM87",BAND:"20M",MODE:"FT8",QSL_RCVD:"Y",QSO_DATE:"20260827"},
  {CALL:"N5DEMO",BAND:"15M",MODE:"SSB",QSO_DATE:"20260826"},
  {CALL:"ZS6CCY",COUNTRY:"South Africa",DXCC:"462",CQZ:"38",PFX:"ZS6",GRIDSQUARE:"KG44",BAND:"10M",MODE:"FT8",QSL_RCVD:"Y",QSO_DATE:"20260825"},
  {CALL:"CT1BWW",COUNTRY:"Portugal",DXCC:"272",CQZ:"14",PFX:"CT1",GRIDSQUARE:"IM58",BAND:"20M",MODE:"SSB",QSL_RCVD:"Y",QSO_DATE:"20260824"},
  {CALL:"LU1AAA",BAND:"40M",MODE:"CW",QSO_DATE:"20260823"},
  {CALL:"G3AAA",COUNTRY:"England",DXCC:"223",CQZ:"14",PFX:"G3",GRIDSQUARE:"IO91",BAND:"17M",MODE:"FT4",QSL_RCVD:"Y",QSO_DATE:"20260822"},
  {CALL:"VE3ABC",COUNTRY:"Canada",DXCC:"1",CQZ:"4",PFX:"VE3",GRIDSQUARE:"FN03",BAND:"20M",MODE:"CW",QSL_RCVD:"Y",QSO_DATE:"20260821"},
  {CALL:"OH2DEMO",BAND:"15M",MODE:"FT8",QSO_DATE:"20260820"},
  {CALL:"ZL1TEST",COUNTRY:"New Zealand",DXCC:"170",CQZ:"32",PFX:"ZL1",GRIDSQUARE:"RF73",BAND:"10M",MODE:"SSB",QSL_RCVD:"Y",QSO_DATE:"20260819"}
];

function createAwards(values = {}) {
  const item = (id,icon,owner,name,detail,goal,featured = false) => {
    const value = values[id] || 0;
    return { id,icon,owner,name,detail,value,goal,featured,level:value >= goal ? "已达到基础门槛" : `还差 ${goal - value}` };
  };
  return [
    item("dxcc","DX","ARRL","DXCC","混合模式 · 当前实体",100,true),
    item("was","W","ARRL","Worked All States","美国 50 州",50),
    item("vucc","VU","ARRL","VUCC","四位 Maidenhead 网格",100),
    item("triple","3","ARRL","Triple Play","CW / 话音 / 数字",150),
    item("waz","Z","CQ","Worked All Zones","CQ 1–40 区",40),
    item("wpx","PX","CQ","WPX","不同呼号前缀",750)
  ];
}

function parseAdif(adif) {
  return String(adif || "").split(/<eor>/i).filter(Boolean).map(record => {
    const result = {};
    const tag = /<([^:>]+):(\d+)(?::[^>]+)?>/gi;
    let match;
    while ((match = tag.exec(record))) {
      const name = match[1].trim().toUpperCase();
      const length = Number(match[2]);
      const start = tag.lastIndex;
      result[name] = record.slice(start,start + length).trim();
      tag.lastIndex = start + length;
    }
    return result;
  }).filter(qso => qso.CALL);
}

function isConfirmed(qso) {
  return qso.QSL_RCVD === "Y" || qso.LOTW_QSL_RCVD === "Y" || qso.APP_LOTW_QSL_RCVD === "Y" || Boolean(qso.QSLRDATE);
}

function normalizedMode(qso) {
  const mode = (qso.SUBMODE || qso.MODE || "").toUpperCase();
  if (["FT8","FT4","JT65","JT9","PSK","RTTY","MFSK","MSK144","VARA","JS8"].some(value => mode.startsWith(value))) return "DIGITAL";
  if (["SSB","USB","LSB","AM","FM"].includes(mode)) return "PHONE";
  return mode;
}

function inferEntityFromCall(call) {
  const clean = String(call || "").toUpperCase().replace(/[^A-Z0-9/]/g,"");
  if (!clean) return null;
  if (exactCallMap.has(clean)) return exactCallMap.get(clean);
  const parts = clean.split("/").filter(part => part && !["P","M","MM","AM","QRP","A"].includes(part));
  const candidates = [clean,...parts.sort((a,b) => b.length - a.length)];
  for (const candidate of candidates) {
    if (exactCallMap.has(candidate)) return exactCallMap.get(candidate);
    const match = prefixEntries.find(([prefix]) => candidate.startsWith(prefix));
    if (match) return match[1];
  }
  return null;
}

function enrichQso(qso) {
  const official = entityById.get(String(qso.DXCC || ""));
  const inferred = official || inferEntityFromCall(qso.CALL);
  if (!inferred) return {...qso};
  return {...qso,_ENTITY:inferred,_RESOLVED_DXCC:official ? String(qso.DXCC) : inferred.id,_RESOLVED_COUNTRY:qso.COUNTRY || inferred.name,_RESOLVED_CQZ:qso.CQZ || inferred.cqz,_INFERRED:!official};
}

function validUsQso(qso) {
  return qso._RESOLVED_DXCC === "291" || /UNITED STATES|ALASKA|HAWAII/i.test(qso.COUNTRY || "");
}

function deriveWpxPrefix(qso) {
  if (qso.PFX) return qso.PFX.toUpperCase();
  const pieces = String(qso.CALL || "").toUpperCase().split("/").filter(value => /[A-Z]/.test(value) && /\d/.test(value));
  const call = (pieces.sort((a,b) => b.length - a.length)[0] || "").replace(/[^A-Z0-9]/g,"");
  const match = call.match(/^([A-Z0-9]*?\d)[A-Z]*$/);
  return match ? match[1] : "";
}

function calculateAwardProgress(qsos) {
  const unique = values => new Set(values.filter(Boolean));
  const values = {};
  values.dxcc = unique(qsos.map(q => q._RESOLVED_DXCC).filter(code => /^\d+$/.test(code || "") && code !== "0")).size;
  values.was = unique(qsos.filter(validUsQso).map(q => (q.STATE || "").toUpperCase()).filter(code => US_STATES.includes(code))).size;
  values.vucc = unique(qsos.map(q => (q.GRIDSQUARE || "").slice(0,4).toUpperCase()).filter(grid => /^[A-R]{2}\d{2}$/.test(grid))).size;
  values.waz = unique(qsos.map(q => q._RESOLVED_CQZ).filter(zone => Number(zone) >= 1 && Number(zone) <= 40)).size;
  values.wpx = unique(qsos.map(deriveWpxPrefix)).size;
  values.triple = ["CW","PHONE","DIGITAL"].reduce((total,mode) => total + unique(qsos.filter(q => normalizedMode(q) === mode && validUsQso(q)).map(q => (q.STATE || "").toUpperCase()).filter(code => US_STATES.includes(code))).size,0);
  return createAwards(values);
}

function entityFor(qso,awardId) {
  if (awardId === "dxcc" && qso._RESOLVED_DXCC) return {key:qso._RESOLVED_DXCC,label:qso._RESOLVED_COUNTRY || `DXCC ${qso._RESOLVED_DXCC}`,inferred:qso._INFERRED,entity:qso._ENTITY};
  if (awardId === "was") {
    const state = (qso.STATE || "").toUpperCase();
    return validUsQso(qso) && US_STATES.includes(state) ? {key:state,label:state} : null;
  }
  if (awardId === "vucc") {
    const grid = (qso.GRIDSQUARE || "").slice(0,4).toUpperCase();
    return /^[A-R]{2}\d{2}$/.test(grid) ? {key:grid,label:grid} : null;
  }
  if (awardId === "triple") {
    const state = (qso.STATE || "").toUpperCase();
    const mode = normalizedMode(qso);
    return validUsQso(qso) && US_STATES.includes(state) && ["CW","PHONE","DIGITAL"].includes(mode) ? {key:`${state}-${mode}`,label:`${state} · ${mode === "DIGITAL" ? "数字" : mode === "PHONE" ? "话音" : "CW"}`} : null;
  }
  if (awardId === "waz" && Number(qso._RESOLVED_CQZ) >= 1 && Number(qso._RESOLVED_CQZ) <= 40) {
    const zone = String(Number(qso._RESOLVED_CQZ));
    return {key:zone,label:`CQ ${zone} 区`,inferred:qso._INFERRED};
  }
  if (awardId === "wpx") {
    const prefix = deriveWpxPrefix(qso);
    return prefix ? {key:prefix,label:prefix,inferred:!qso.PFX} : null;
  }
  return null;
}

function bandFor(qso) {
  const band = (qso.BAND || "").toUpperCase().replace(/METERS?$/,"M");
  if (BAND_COLUMNS.includes(band)) return band;
  const mhz = Number(qso.FREQ);
  if (!mhz) return "OTHER";
  const ranges = [[1.8,2,"160M"],[3.5,4,"80M"],[5.2,5.5,"60M"],[7,7.4,"40M"],[10.1,10.2,"30M"],[14,14.4,"20M"],[18.068,18.2,"17M"],[21,21.5,"15M"],[24.89,25,"12M"],[28,30,"10M"],[50,54,"6M"],[144,148,"2M"],[420,450,"70CM"]];
  return (ranges.find(([low,high]) => mhz >= low && mhz <= high) || [])[2] || "OTHER";
}

function catalogFor(awardId,mode) {
  if (awardId === "dxcc") return DXCC_CATALOG.map(entity => ({key:entity.id,label:entity.name,entity}));
  if (awardId === "was") return US_STATES.map(state => ({key:state,label:state}));
  if (awardId === "waz") return Array.from({length:40},(_,index) => ({key:String(index + 1),label:`CQ ${index + 1} 区`}));
  if (awardId === "triple") {
    const modes = mode === "MIXED" ? ["CW","PHONE","DIGITAL"] : [mode];
    return modes.flatMap(item => US_STATES.map(state => ({key:`${state}-${item}`,label:`${state} · ${item === "DIGITAL" ? "数字" : item === "PHONE" ? "话音" : "CW"}`})));
  }
  return [];
}

function rowStatus(row) {
  return row.qsos.some(isConfirmed) ? "confirmed" : row.qsos.length ? "unconfirmed" : "none";
}

function buildMatrix(qsos,awardId,mode) {
  const rows = new Map(catalogFor(awardId,mode).map(item => [item.key,{...item,qsos:[],inferred:false}]));
  qsos.forEach(qso => {
    const item = entityFor(qso,awardId);
    if (!item) return;
    if (!rows.has(item.key)) rows.set(item.key,{...item,qsos:[],inferred:false});
    const row = rows.get(item.key);
    row.qsos.push(qso);
    row.inferred ||= Boolean(item.inferred);
    row.entity ||= item.entity;
  });
  const order = {confirmed:0,unconfirmed:1,none:2};
  return [...rows.values()].sort((a,b) => order[rowStatus(a)] - order[rowStatus(b)] || a.label.localeCompare(b.label,"zh-CN",{numeric:true}));
}

function renderAwards() {
  $("#award-grid").innerHTML = awards.map(award => `
    <article class="award-card ${award.featured ? "featured" : ""} ${selectedAwardId === award.id ? "selected" : ""}">
      <div class="award-top"><span class="award-icon">${h(award.icon)}</span><span class="award-owner">${h(award.owner)}</span></div>
      <h3>${h(award.name)}</h3><p>${h(award.detail)}</p>
      <div class="progress-row"><strong>${award.value.toLocaleString()}<small> / ${award.goal.toLocaleString()}</small></strong><span>${h(award.level)}</span></div>
      <div class="progress-bar"><i style="width:${Math.min(100,award.value / award.goal * 100)}%"></i></div>
      <button class="analyze-button" type="button" data-analyze="${award.id}">查看地图与明细 <span>→</span></button>
    </article>`).join("");
  $("#paper-award").innerHTML = awards.map(award => `<option value="${award.id}">${h(award.name)} — ${award.value}/${award.goal}</option>`).join("");
}

function mapPoint(entity) {
  if (!entity || !Number.isFinite(entity.lat) || !Number.isFinite(entity.lon)) return null;
  return {x:((entity.lon + 180) / 360) * 960,y:((90 - entity.lat) / 180) * 430};
}

function buildMapRows(qsos,awardId,rows) {
  if (awardId === "dxcc") return rows.filter(row => row.entity).map(row => ({...row,status:rowStatus(row)}));
  const grouped = new Map();
  qsos.forEach(qso => {
    const awardItem = entityFor(qso,awardId);
    const entity = qso._ENTITY;
    if (!awardItem || !entity) return;
    if (!grouped.has(entity.id)) grouped.set(entity.id,{key:entity.id,label:entity.name,entity,qsos:[]});
    grouped.get(entity.id).qsos.push(qso);
  });
  return [...grouped.values()].map(row => ({...row,status:rowStatus(row)}));
}

function renderMap() {
  const visible = selectedStatus === "all" ? currentMapRows : currentMapRows.filter(row => row.status === selectedStatus);
  const located = visible.map(row => ({row,point:mapPoint(row.entity)})).filter(item => item.point);
  $("#analysis-map-pins").innerHTML = located.map(({row,point}) => `
    <circle class="entity-pin ${row.status}" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${row.status === "none" ? 3.4 : 5.2}"
      tabindex="0" role="button" data-key="${h(row.key)}" data-label="${h(row.label)}" data-status="${row.status}" data-count="${row.qsos.length}"
      aria-label="${h(row.label)}，${STATUS_LABELS[row.status]}，${row.qsos.length} 个 QSO"></circle>`).join("");
  const counts = {confirmed:0,unconfirmed:0,none:0};
  currentMapRows.forEach(row => counts[row.status]++);
  $("#legend-confirmed").textContent = counts.confirmed;
  $("#legend-unconfirmed").textContent = counts.unconfirmed;
  $("#legend-none").textContent = counts.none;
  $("#analysis-map-empty").hidden = located.length > 0;
  $("#entity-map").setAttribute("aria-label",`实体位置地图：已确认 ${counts.confirmed}，待确认 ${counts.unconfirmed}，无 ${counts.none}`);
}

function showMapTooltip(pin,event) {
  const tooltip = $("#map-tooltip");
  const rect = $("#analysis-map").getBoundingClientRect();
  tooltip.innerHTML = `<strong>${h(pin.dataset.label)}</strong><span>${STATUS_LABELS[pin.dataset.status] || ""} · ${Number(pin.dataset.count).toLocaleString()} 个 QSO</span>`;
  const x = event?.clientX ? event.clientX - rect.left : rect.width / 2;
  const y = event?.clientY ? event.clientY - rect.top : rect.height / 2;
  tooltip.style.left = `${Math.max(10,Math.min(rect.width - 170,x + 12))}px`;
  tooltip.style.top = `${Math.max(10,y - 54)}px`;
  tooltip.hidden = false;
}

function applyMapTransform() {
  $("#map-stage").setAttribute("transform",`translate(${mapView.x} ${mapView.y}) scale(${mapView.scale})`);
}

function zoomMap(delta) {
  mapView.scale = Math.max(1,Math.min(5,mapView.scale + delta));
  if (mapView.scale === 1) { mapView.x = 0; mapView.y = 0; }
  applyMapTransform();
}

function matrixLabelFor(awardId) {
  if (awardId === "vucc") return ["网格","网格与波段状态"];
  if (awardId === "was" || awardId === "triple") return ["州","州与波段状态"];
  if (awardId === "waz") return ["CQ 区","CQ 区与波段状态"];
  if (awardId === "wpx") return ["前缀","前缀与波段状态"];
  return ["实体","实体与波段状态"];
}

function renderMatrix() {
  const query = $("#matrix-search").value.trim().toLocaleLowerCase();
  const rows = currentMatrixRows.filter(row => (selectedStatus === "all" || rowStatus(row) === selectedStatus) && (!query || row.label.toLocaleLowerCase().includes(query)));
  const [firstColumn,title] = matrixLabelFor(selectedAwardId);
  $("#matrix-title").textContent = title;
  $("#matrix-head").innerHTML = `<tr><th scope="col">${firstColumn}</th><th scope="col">状态</th>${BAND_COLUMNS.map(band => `<th scope="col">${band.toLowerCase()}</th>`).join("")}</tr>`;
  $("#matrix-body").innerHTML = rows.length ? rows.map(row => {
    const status = rowStatus(row);
    const cells = BAND_COLUMNS.map(band => {
      const bandQsos = row.qsos.filter(qso => bandFor(qso) === band);
      const confirmedCount = bandQsos.filter(isConfirmed).length;
      const cellStatus = confirmedCount ? "confirmed" : bandQsos.length ? "unconfirmed" : "none";
      return `<td class="matrix-cell ${cellStatus}" title="${h(row.label)} · ${band.toLowerCase()} · ${STATUS_LABELS[cellStatus]}">${confirmedCount || bandQsos.length || "—"}</td>`;
    }).join("");
    return `<tr data-row-key="${h(row.key)}"><th scope="row">${h(row.label)}${row.inferred && status !== "none" ? '<span class="inferred-badge">前缀推断</span>' : ""}</th><td><span class="status ${status}">${STATUS_LABELS[status]}</span></td>${cells}</tr>`;
  }).join("") : '<tr><td class="matrix-empty" colspan="15">当前筛选条件下没有项目。</td></tr>';
  const fixed = catalogFor(selectedAwardId,selectedMode).length > 0;
  $("#matrix-note").textContent = fixed
    ? "此奖项使用固定目标目录，因此未联络项目会明确显示为“无”。DXCC 目录与前缀推断来自公开 Country Files 数据。"
    : selectedAwardId === "vucc"
      ? "VUCC 的全球网格数量很大，此处列出日志中出现过的网格；未出现的网格不逐项展开。"
      : "WPX 没有有限的固定前缀目录，此处列出日志中出现过的前缀。";
}

function formatQsoDate(value) {
  const date = String(value || "");
  return /^\d{8}$/.test(date) ? `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}` : "—";
}

function renderPendingList(qsos) {
  const pending = qsos.filter(qso => !isConfirmed(qso)).sort((a,b) => `${b.QSO_DATE || ""}${b.TIME_ON || ""}`.localeCompare(`${a.QSO_DATE || ""}${a.TIME_ON || ""}`));
  $("#pending-list-count").textContent = `${pending.length.toLocaleString()} 条`;
  $("#pending-body").innerHTML = pending.length ? pending.slice(0,pendingVisible).map(qso => {
    const entity = qso._ENTITY;
    const band = bandFor(qso) === "OTHER" ? qso.BAND || qso.FREQ || "—" : bandFor(qso);
    const source = !entity ? '<span class="status none">LoTW 未提供</span>' : qso._INFERRED ? '<span class="status inferred">前缀推断</span>' : '<span class="status confirmed">LoTW 字段</span>';
    return `<tr><td><strong>${h(qso.CALL)}</strong></td><td>${formatQsoDate(qso.QSO_DATE)}</td><td>${h(band)}</td><td>${h(qso.MODE || qso.SUBMODE || "—")}</td><td>${h(entity?.name || "无法推断")}</td><td>${source}</td></tr>`;
  }).join("") : '<tr><td class="matrix-empty" colspan="6">当前没有待确认 QSO。</td></tr>';
  $("#pending-more").hidden = pending.length <= pendingVisible;
  $("#pending-more").textContent = `再显示 ${Math.min(80,pending.length - pendingVisible)} 条`;
}

function renderAwardAnalysis(awardId = selectedAwardId,scroll = false) {
  const award = awards.find(item => item.id === awardId) || awards[0];
  selectedAwardId = award.id;
  const filtered = selectedMode === "MIXED" ? [...currentQsos] : currentQsos.filter(qso => normalizedMode(qso) === selectedMode);
  const confirmed = filtered.filter(isConfirmed);
  const rows = buildMatrix(filtered,award.id,selectedMode);
  currentMatrixRows = rows;
  currentMapRows = buildMapRows(filtered,award.id,rows);
  const confirmedRows = rows.filter(row => rowStatus(row) === "confirmed");
  const unconfirmedRows = rows.filter(row => rowStatus(row) === "unconfirmed");
  const noneRows = rows.filter(row => rowStatus(row) === "none");
  const unresolvedPending = filtered.filter(qso => !isConfirmed(qso) && !qso._ENTITY).length;
  const analysisGoal = award.id === "triple" && selectedMode !== "MIXED" ? 50 : award.goal;
  const creditValue = confirmedRows.length;
  const percentage = Math.min(100,Math.round((creditValue / analysisGoal) * 100));

  $("#analysis-title").textContent = `${award.name} 分析`;
  $("#analysis-subtitle").textContent = selectedMode === "MIXED" ? award.detail : `${selectedMode === "DIGITAL" ? "数字" : selectedMode === "PHONE" ? "话音" : "CW"}模式`;
  $("#map-title").textContent = award.id === "dxcc" ? "DXCC 实体三态分布" : "可定位 QSO 的实体分布";
  $("#analysis-callsign").textContent = $("#callsign").value.trim().toUpperCase() || "未连接";
  $("#analysis-qso-total").textContent = filtered.length.toLocaleString();
  $("#analysis-confirmed-total").textContent = confirmed.length.toLocaleString();
  $("#analysis-calculated").textContent = lastCalculated;
  $("#analysis-percent").textContent = `${percentage}%`;
  $("#analysis-value").textContent = creditValue.toLocaleString();
  $("#analysis-goal").textContent = analysisGoal.toLocaleString();
  $("#analysis-ring").style.setProperty("--progress",`${percentage * 3.6}deg`);
  $("#analysis-eligibility").className = `eligibility-note ${creditValue >= analysisGoal ? "ready" : "working"}`;
  $("#analysis-eligibility").innerHTML = creditValue >= analysisGoal
    ? "<strong>已达到基础数量门槛。</strong> 正式资格仍请在奖项主办方系统中核对波段、模式、日期和实体有效性。"
    : `<strong>距离基础门槛还差 ${Math.max(0,analysisGoal - creditValue)} 项。</strong> 已有 ${unconfirmedRows.length} 项联络正在等待 LoTW 确认。`;
  $("#analysis-stats").innerHTML = `
    <article><span>已确认</span><strong>${confirmedRows.length}</strong><small>可计入当前视图</small></article>
    <article><span>待确认</span><strong>${unconfirmedRows.length}</strong><small>已联络但未确认</small></article>
    <article><span>无</span><strong>${noneRows.length}</strong><small>固定目录中尚未联络</small></article>
    <article><span>无法推断实体</span><strong>${unresolvedPending}</strong><small>仍保留在待确认列表</small></article>`;
  renderMap();
  renderMatrix();
  renderPendingList(filtered);
  renderAwards();
  if (scroll) $("#award-analysis").scrollIntoView({behavior:"smooth",block:"start"});
}

function qsoKey(qso) {
  if (qso.APP_LOTW_QSO_TIMESTAMP) return `lotw:${qso.APP_LOTW_QSO_TIMESTAMP}`;
  const time = (qso.TIME_ON || "").replace(/[^0-9]/g,"").slice(0,4);
  return [qso.CALL,qso.QSO_DATE,time,qso.BAND || qso.FREQ,qso.MODE].map(value => String(value || "").toUpperCase()).join("|");
}

function mergeQsoReports(qsos,confirmedQsos) {
  const confirmedByKey = new Map(confirmedQsos.map(qso => [qsoKey(qso),qso]));
  return qsos.map(qso => {
    const confirmation = confirmedByKey.get(qsoKey(qso));
    return confirmation ? {...qso,...confirmation,QSL_RCVD:"Y"} : qso;
  });
}

function applyQsoData(qsos,confirmedQsos,calculatedLabel) {
  currentConfirmed = confirmedQsos.map(qso => enrichQso({...qso,QSL_RCVD:"Y"}));
  currentQsos = mergeQsoReports(qsos,confirmedQsos).map(enrichQso);
  awards = calculateAwardProgress(currentConfirmed);
  lastCalculated = calculatedLabel;
  pendingVisible = 80;
  $("#qso-count").textContent = currentQsos.length.toLocaleString();
  $("#confirmed-count").textContent = currentConfirmed.length.toLocaleString();
  $("#pending-count").textContent = currentQsos.filter(qso => !isConfirmed(qso)).length.toLocaleString();
  $("#dxcc-count").textContent = awards.find(award => award.id === "dxcc").value.toLocaleString();
  renderAwardAnalysis("dxcc");
}

function applyLiveLog(adif,qslAdif = "") {
  const qsos = parseAdif(adif);
  if (!qsos.length) throw new Error("LoTW 没有返回任何 QSO。请检查登录信息或稍后重试。");
  const confirmedQsos = qslAdif ? parseAdif(qslAdif) : qsos.filter(isConfirmed);
  applyQsoData(qsos,confirmedQsos,new Intl.DateTimeFormat("zh-CN",{dateStyle:"short",timeStyle:"short"}).format(new Date()));
}

function openPaperDialog() {
  $("#paper-award").value = selectedAwardId;
  const link = $("#paper-dialog a");
  link.href = AWARD_LINKS[selectedAwardId] || AWARD_LINKS.dxcc;
  link.textContent = selectedAwardId === "waz" || selectedAwardId === "wpx" ? "打开 CQ 官方奖项页面" : "打开 ARRL 官方奖项页面";
  $("#paper-dialog").showModal();
}

$("#connect-form").addEventListener("submit",async event => {
  event.preventDefault();
  const button = event.submitter;
  const help = $("#connection-help");
  const config = window.BETTERLOTW_CONFIG || {};
  if (!config.syncEndpoint || config.syncEndpoint.startsWith("__")) {
    help.hidden = false;
    help.textContent = "同步服务尚未配置。请先完成 Cloudflare Worker 配置，或使用示例数据查看界面。";
    return;
  }
  button.disabled = true;
  button.textContent = "正在下载完整 QSO 与确认详情…";
  help.hidden = true;
  try {
    const response = await fetch(config.syncEndpoint,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({username:$("#callsign").value.trim(),password:$("#lotw-key").value}),cache:"no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "同步服务无法验证 LoTW 登录信息。");
    applyLiveLog(data.adif || "",data.qslAdif || "");
    $("#lotw-key").value = "";
    button.textContent = "完整日志同步成功 ✓";
    setTimeout(() => { button.textContent = "下载并分析全部 QSO"; },2500);
    $("#award-analysis").scrollIntoView({behavior:"smooth",block:"start"});
  } catch (error) {
    help.hidden = false;
    help.textContent = error instanceof TypeError && /fetch/i.test(error.message) ? "无法连接 LoTW 同步服务。请检查网络和 Cloudflare Worker 状态后重试。" : error.message;
    button.textContent = "重新同步";
  } finally {
    button.disabled = false;
  }
});

$("#award-grid").addEventListener("click",event => {
  const button = event.target.closest("[data-analyze]");
  if (button) renderAwardAnalysis(button.dataset.analyze,true);
});
$("#analysis-mode").addEventListener("change",event => {
  selectedMode = event.target.value;
  pendingVisible = 80;
  renderAwardAnalysis(selectedAwardId);
});
$("#status-filter").addEventListener("change",event => {
  selectedStatus = event.target.value;
  renderMap();
  renderMatrix();
});
$("#matrix-search").addEventListener("input",renderMatrix);
$("#demo-button").addEventListener("click",() => {
  $("#callsign").value = "DEMO";
  applyQsoData(demoQsos,demoQsos.filter(isConfirmed),"示例数据");
  $("#connection-help").hidden = true;
  $("#award-analysis").scrollIntoView({behavior:"smooth",block:"start"});
});
$("#pending-more").addEventListener("click",() => {
  pendingVisible += 80;
  const filtered = selectedMode === "MIXED" ? currentQsos : currentQsos.filter(qso => normalizedMode(qso) === selectedMode);
  renderPendingList(filtered);
});
$("#analysis-paper-button").addEventListener("click",openPaperDialog);
$("#paper-button").addEventListener("click",openPaperDialog);
$(".dialog-close").addEventListener("click",() => $("#paper-dialog").close());
$("#paper-award").addEventListener("change",event => {
  selectedAwardId = event.target.value;
  const link = $("#paper-dialog a");
  link.href = AWARD_LINKS[selectedAwardId] || AWARD_LINKS.dxcc;
  link.textContent = selectedAwardId === "waz" || selectedAwardId === "wpx" ? "打开 CQ 官方奖项页面" : "打开 ARRL 官方奖项页面";
});

$("#map-zoom-in").addEventListener("click",() => zoomMap(0.5));
$("#map-zoom-out").addEventListener("click",() => zoomMap(-0.5));
$("#map-reset").addEventListener("click",() => {
  Object.assign(mapView,{scale:1,x:0,y:0});
  applyMapTransform();
});

$("#entity-map").addEventListener("pointerdown",event => {
  if (event.target.closest(".entity-pin")) return;
  mapView.dragging = true;
  mapView.startX = event.clientX;
  mapView.startY = event.clientY;
  mapView.originX = mapView.x;
  mapView.originY = mapView.y;
  event.currentTarget.setPointerCapture(event.pointerId);
});
$("#entity-map").addEventListener("pointermove",event => {
  const pin = event.target.closest(".entity-pin");
  if (pin) showMapTooltip(pin,event);
  if (!mapView.dragging) return;
  const rect = event.currentTarget.getBoundingClientRect();
  mapView.x = mapView.originX + ((event.clientX - mapView.startX) / rect.width) * 960;
  mapView.y = mapView.originY + ((event.clientY - mapView.startY) / rect.height) * 430;
  applyMapTransform();
});
$("#entity-map").addEventListener("pointerup",event => {
  mapView.dragging = false;
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
});
$("#entity-map").addEventListener("pointerleave",() => {
  mapView.dragging = false;
  $("#map-tooltip").hidden = true;
});
$("#analysis-map-pins").addEventListener("focusin",event => {
  const pin = event.target.closest(".entity-pin");
  if (pin) showMapTooltip(pin);
});
$("#analysis-map-pins").addEventListener("focusout",() => { $("#map-tooltip").hidden = true; });
$("#analysis-map-pins").addEventListener("click",event => {
  const pin = event.target.closest(".entity-pin");
  if (!pin || selectedAwardId !== "dxcc") return;
  const row = [...$("#matrix-body").querySelectorAll("tr")].find(item => item.dataset.rowKey === pin.dataset.key);
  if (row) {
    row.classList.add("row-highlight");
    row.scrollIntoView({behavior:"smooth",block:"center"});
    setTimeout(() => row.classList.remove("row-highlight"),1800);
  }
});

renderAwards();
renderAwardAnalysis("dxcc");
