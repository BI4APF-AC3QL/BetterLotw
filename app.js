const BAND_COLUMNS = ["160M", "80M", "60M", "40M", "30M", "20M", "17M", "15M", "12M", "10M", "6M", "2M", "70CM"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

let awards = [
  { id: "dxcc", icon: "DX", type: "ARRL AWARD", name: "DXCC", detail: "Mixed · Current", value: 92, goal: 100, level: "8 to go", featured: true },
  { id: "was", icon: "W", type: "ARRL AWARD", name: "Worked All States", detail: "Mixed", value: 46, goal: 50, level: "4 to go" },
  { id: "vucc", icon: "V", type: "ARRL AWARD", name: "VUCC", detail: "6 metres", value: 76, goal: 100, level: "24 to go" },
  { id: "triple", icon: "3", type: "ARRL AWARD", name: "Triple Play", detail: "Digital / Phone / CW", value: 111, goal: 150, level: "39 to go" },
  { id: "waz", icon: "Z", type: "CQ AWARD", name: "Worked All Zones", detail: "Mixed", value: 34, goal: 40, level: "6 to go" },
  { id: "wpx", icon: "P", type: "CQ AWARD", name: "WPX", detail: "Mixed prefixes", value: 682, goal: 750, level: "68 to go" }
];

const confirmations = [
  ["JA1ABC", "Japan · 20m FT8", "FT8", "2h ago"], ["VK4XYZ", "Australia · 15m SSB", "SSB", "Yesterday"], ["W1AW", "United States · 40m CW", "CW", "Aug 28"], ["ZS6CCY", "South Africa · 10m FT8", "FT8", "Aug 27"], ["CT1BWW", "Portugal · 20m SSB", "SSB", "Aug 25"]
];

const demoQsos = [
  { CALL:"JA1ABC", COUNTRY:"Japan", DXCC:"339", CQZ:"25", PFX:"JA1", GRIDSQUARE:"PM95", BAND:"20M", MODE:"FT8", QSL_RCVD:"Y", QSO_DATE:"20260831" },
  { CALL:"VK4XYZ", COUNTRY:"Australia", DXCC:"150", CQZ:"30", PFX:"VK4", GRIDSQUARE:"QG62", BAND:"15M", MODE:"SSB", QSL_RCVD:"Y", QSO_DATE:"20260830" },
  { CALL:"W1AW", COUNTRY:"United States", DXCC:"291", STATE:"CT", CQZ:"5", PFX:"W1", GRIDSQUARE:"FN31", BAND:"40M", MODE:"CW", QSL_RCVD:"Y", QSO_DATE:"20260828" },
  { CALL:"K6TEST", COUNTRY:"United States", DXCC:"291", STATE:"CA", CQZ:"3", PFX:"K6", GRIDSQUARE:"CM87", BAND:"20M", MODE:"FT8", QSL_RCVD:"Y", QSO_DATE:"20260827" },
  { CALL:"N5DEMO", COUNTRY:"United States", DXCC:"291", STATE:"TX", CQZ:"4", PFX:"N5", GRIDSQUARE:"EM12", BAND:"15M", MODE:"SSB", QSL_RCVD:"N", QSO_DATE:"20260826" },
  { CALL:"ZS6CCY", COUNTRY:"South Africa", DXCC:"462", CQZ:"38", PFX:"ZS6", GRIDSQUARE:"KG44", BAND:"10M", MODE:"FT8", QSL_RCVD:"Y", QSO_DATE:"20260825" },
  { CALL:"CT1BWW", COUNTRY:"Portugal", DXCC:"272", CQZ:"14", PFX:"CT1", GRIDSQUARE:"IM58", BAND:"20M", MODE:"SSB", QSL_RCVD:"Y", QSO_DATE:"20260824" },
  { CALL:"LU1AAA", COUNTRY:"Argentina", DXCC:"100", CQZ:"13", PFX:"LU1", GRIDSQUARE:"GF05", BAND:"40M", MODE:"CW", QSL_RCVD:"N", QSO_DATE:"20260823" },
  { CALL:"G3AAA", COUNTRY:"England", DXCC:"223", CQZ:"14", PFX:"G3", GRIDSQUARE:"IO91", BAND:"17M", MODE:"FT4", QSL_RCVD:"Y", QSO_DATE:"20260822" },
  { CALL:"VE3ABC", COUNTRY:"Canada", DXCC:"1", CQZ:"4", PFX:"VE3", GRIDSQUARE:"FN03", BAND:"20M", MODE:"CW", QSL_RCVD:"Y", QSO_DATE:"20260821" },
  { CALL:"OH2DEMO", COUNTRY:"Finland", DXCC:"224", CQZ:"15", PFX:"OH2", GRIDSQUARE:"KP20", BAND:"15M", MODE:"FT8", QSL_RCVD:"N", QSO_DATE:"20260820" },
  { CALL:"ZL1TEST", COUNTRY:"New Zealand", DXCC:"170", CQZ:"32", PFX:"ZL1", GRIDSQUARE:"RF73", BAND:"10M", MODE:"SSB", QSL_RCVD:"Y", QSO_DATE:"20260819" }
];

const $ = selector => document.querySelector(selector);
const h = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
let currentQsos = [];
let currentConfirmed = [];
let selectedAwardId = "dxcc";
let selectedMode = "MIXED";
let lastCalculated = "Demo preview";

function renderAwards(items = awards) {
  $("#award-grid").innerHTML = items.map(a => `<article class="award-card ${a.featured ? "featured" : ""} ${selectedAwardId === a.id ? "selected" : ""}" data-award="${a.id}"><div class="award-top"><div class="award-icon">${h(a.icon)}</div><span class="award-type">${h(a.type)}</span></div><h3 class="award-name">${h(a.name)}</h3><p class="award-detail">${h(a.detail)}</p><div class="progress-row"><span class="progress-number">${a.value}<small> / ${a.goal}</small></span><span class="progress-pill">${h(a.level)}</span></div><div class="progress-bar"><i style="width:${Math.min(100, a.value / a.goal * 100)}%"></i></div><button class="analyze-button" type="button" data-analyze="${a.id}" aria-label="Analyze ${h(a.name)}">Analyze award <span>→</span></button></article>`).join("");
  $("#paper-award").innerHTML = awards.map(a => `<option value="${a.id}">${h(a.name)} — ${a.value}/${a.goal} credits</option>`).join("");
}

function renderFeed() {
  $("#feed").innerHTML = confirmations.map(c => `<div class="feed-item"><span class="feed-band">${h(c[2])}</span><div><strong>${h(c[0])}</strong><span>${h(c[1])}</span></div><time>${h(c[3])}</time></div>`).join("");
}

function setDemo() {
  $("#callsign").value = "DEMO";
  applyQsoData(demoQsos, "Demo preview");
  $("#connection-help").hidden = true;
  $("#sync-card").scrollIntoView({ behavior: "smooth", block: "center" });
}

function parseAdif(adif) {
  return adif.split(/<eor>/i).filter(Boolean).map(record => {
    const result = {};
    const tag = /<([^:>]+):(\d+)(?::[^>]+)?>/gi;
    let match;
    while ((match = tag.exec(record))) {
      const name = match[1].trim().toUpperCase();
      const length = Number(match[2]);
      const start = tag.lastIndex;
      result[name] = record.slice(start, start + length).trim();
      tag.lastIndex = start + length;
    }
    return result;
  }).filter(qso => qso.CALL);
}

function isConfirmed(qso) {
  return qso.QSL_RCVD === "Y" || qso.LOTW_QSL_RCVD === "Y" || qso.APP_LOTW_QSL_RCVD === "Y" || Boolean(qso.QSLRDATE);
}

function normalizedMode(qso) {
  const mode = (qso.MODE || qso.SUBMODE || "").toUpperCase();
  if (["FT8", "FT4", "JT65", "JT9", "PSK", "RTTY", "MFSK", "MSK144", "VARA", "JS8"].some(value => mode.startsWith(value))) return "DIGITAL";
  if (["SSB", "USB", "LSB", "AM", "FM"].includes(mode)) return "PHONE";
  return mode;
}

function validUsQso(qso) {
  return qso.DXCC === "291" || /UNITED STATES|ALASKA|HAWAII/i.test(qso.COUNTRY || "");
}

function calculateAwardProgress(qsos) {
  const unique = values => new Set(values.filter(Boolean));
  const dxcc = unique(qsos.map(q => q.DXCC).filter(code => /^\d+$/.test(code) && code !== "0")).size;
  const states = unique(qsos.filter(validUsQso).map(q => (q.STATE || "").toUpperCase()).filter(code => US_STATES.includes(code))).size;
  const grids = unique(qsos.map(q => (q.GRIDSQUARE || "").slice(0, 4).toUpperCase()).filter(grid => /^[A-R]{2}\d{2}$/.test(grid))).size;
  const zones = unique(qsos.map(q => q.CQZ).filter(zone => Number(zone) >= 1 && Number(zone) <= 40)).size;
  const prefixes = unique(qsos.map(q => (q.PFX || "").toUpperCase())).size;
  const triple = ["CW", "PHONE", "DIGITAL"].reduce((total, mode) => total + unique(qsos.filter(q => normalizedMode(q) === mode && validUsQso(q)).map(q => (q.STATE || "").toUpperCase()).filter(code => US_STATES.includes(code))).size, 0);
  const progress = (id, icon, type, name, detail, value, goal, featured = false) => ({ id, icon, type, name, detail, value, goal, level: value >= goal ? "Award ready" : `${goal - value} to go`, featured });
  return [
    progress("dxcc", "DX", "ARRL AWARD", "DXCC", "Mixed · LoTW confirmed", dxcc, 100, true),
    progress("was", "W", "ARRL AWARD", "Worked All States", "Mixed · US confirmations", states, 50),
    progress("vucc", "V", "ARRL AWARD", "VUCC", "Confirmed 4-character grids", grids, 100),
    progress("triple", "3", "ARRL AWARD", "Triple Play", "CW / Phone / Digital", triple, 150),
    progress("waz", "Z", "CQ AWARD", "Worked All Zones", "CQ zones reported in ADIF", zones, 40),
    progress("wpx", "P", "CQ AWARD", "WPX", "Prefixes reported in ADIF", prefixes, 750)
  ];
}

function entityFor(qso, awardId) {
  if (awardId === "dxcc") return /^\d+$/.test(qso.DXCC || "") && qso.DXCC !== "0" ? { key: qso.DXCC, label: qso.COUNTRY || `DXCC ${qso.DXCC}` } : null;
  if (awardId === "was") {
    const state = (qso.STATE || "").toUpperCase();
    return validUsQso(qso) && US_STATES.includes(state) ? { key: state, label: state } : null;
  }
  if (awardId === "vucc") {
    const grid = (qso.GRIDSQUARE || "").slice(0, 4).toUpperCase();
    return /^[A-R]{2}\d{2}$/.test(grid) ? { key: grid, label: grid } : null;
  }
  if (awardId === "triple") {
    const state = (qso.STATE || "").toUpperCase();
    const mode = normalizedMode(qso);
    return validUsQso(qso) && US_STATES.includes(state) && ["CW", "PHONE", "DIGITAL"].includes(mode) ? { key: `${state}-${mode}`, label: `${state} · ${mode === "DIGITAL" ? "Digital" : mode === "PHONE" ? "Phone" : "CW"}` } : null;
  }
  if (awardId === "waz") return Number(qso.CQZ) >= 1 && Number(qso.CQZ) <= 40 ? { key: String(Number(qso.CQZ)), label: `CQ Zone ${Number(qso.CQZ)}` } : null;
  if (awardId === "wpx") return qso.PFX ? { key: qso.PFX.toUpperCase(), label: qso.PFX.toUpperCase() } : null;
  return null;
}

function bandFor(qso) {
  const band = (qso.BAND || "").toUpperCase().replace(/METERS?$/, "M");
  if (BAND_COLUMNS.includes(band)) return band;
  const mhz = Number(qso.FREQ);
  if (!mhz) return "OTHER";
  const ranges = [[1.8,2,"160M"],[3.5,4,"80M"],[5.2,5.5,"60M"],[7,7.4,"40M"],[10.1,10.2,"30M"],[14,14.4,"20M"],[18.068,18.2,"17M"],[21,21.5,"15M"],[24.89,25,"12M"],[28,30,"10M"],[50,54,"6M"],[144,148,"2M"],[420,450,"70CM"]];
  return (ranges.find(([low, high]) => mhz >= low && mhz <= high) || [])[2] || "OTHER";
}

function catalogFor(awardId, mode) {
  if (awardId === "was") return US_STATES.map(state => ({ key: state, label: state }));
  if (awardId === "waz") return Array.from({ length: 40 }, (_, index) => ({ key: String(index + 1), label: `CQ Zone ${index + 1}` }));
  if (awardId === "triple") {
    const modes = mode === "MIXED" ? ["CW", "PHONE", "DIGITAL"] : [mode];
    return modes.flatMap(item => US_STATES.map(state => ({ key: `${state}-${item}`, label: `${state} · ${item === "DIGITAL" ? "Digital" : item === "PHONE" ? "Phone" : "CW"}` })));
  }
  return [];
}

function buildMatrix(qsos, awardId, mode) {
  const rows = new Map(catalogFor(awardId, mode).map(item => [item.key, { ...item, qsos: [] }]));
  qsos.forEach(qso => {
    const entity = entityFor(qso, awardId);
    if (!entity) return;
    if (!rows.has(entity.key)) rows.set(entity.key, { ...entity, qsos: [] });
    rows.get(entity.key).qsos.push(qso);
  });
  return [...rows.values()].sort((a, b) => {
    const aStatus = a.qsos.some(isConfirmed) ? 0 : a.qsos.length ? 1 : 2;
    const bStatus = b.qsos.some(isConfirmed) ? 0 : b.qsos.length ? 1 : 2;
    return aStatus - bStatus || a.label.localeCompare(b.label, undefined, { numeric: true });
  });
}

function gridToPoint(grid) {
  const value = (grid || "").trim().toUpperCase();
  if (!/^[A-R]{2}\d{2}/.test(value)) return null;
  const lon = (value.charCodeAt(0) - 65) * 20 - 180 + Number(value[2]) * 2 + 1;
  const lat = (value.charCodeAt(1) - 65) * 10 - 90 + Number(value[3]) + 0.5;
  return { x: ((lon + 180) / 360) * 960, y: ((90 - lat) / 180) * 430 };
}

function renderAnalysisMap(qsos) {
  const pins = qsos.map(qso => ({ point: gridToPoint(qso.GRIDSQUARE), confirmed: isConfirmed(qso), call: qso.CALL })).filter(item => item.point).slice(0, 400);
  $("#analysis-map-pins").innerHTML = pins.map(item => `<circle class="${item.confirmed ? "confirmed" : "unconfirmed"}" cx="${item.point.x.toFixed(1)}" cy="${item.point.y.toFixed(1)}" r="6"><title>${h(item.call)} · ${item.confirmed ? "Confirmed" : "Unconfirmed"}</title></circle>`).join("");
  $("#analysis-map-empty").hidden = pins.length > 0;
  $("#analysis-map").setAttribute("aria-label", pins.length ? `${pins.length} contacts plotted from Maidenhead grid coordinates` : "No contacts have usable grid coordinates");
}

function renderAwardAnalysis(awardId = selectedAwardId, scroll = false) {
  const award = awards.find(item => item.id === awardId) || awards[0];
  selectedAwardId = award.id;
  const filtered = selectedMode === "MIXED" ? [...currentQsos] : currentQsos.filter(qso => normalizedMode(qso) === selectedMode);
  const confirmed = filtered.filter(isConfirmed);
  const rows = buildMatrix(filtered, award.id, selectedMode);
  const confirmedRows = rows.filter(row => row.qsos.some(isConfirmed));
  const unconfirmedRows = rows.filter(row => row.qsos.length && !row.qsos.some(isConfirmed));
  const ineligibleConfirmed = confirmed.filter(qso => !entityFor(qso, award.id));
  const analysisGoal = award.id === "triple" && selectedMode !== "MIXED" ? 50 : award.goal;
  const creditValue = confirmedRows.length;
  const percentage = Math.min(100, Math.round((creditValue / analysisGoal) * 100));
  const contactedRows = rows.filter(row => row.qsos.length);
  const mostCommon = [...contactedRows].sort((a,b) => b.qsos.length - a.qsos.length)[0];
  const section = $("#award-analysis");

  section.hidden = false;
  $("#analysis-title").textContent = `${award.name} analysis`;
  $("#analysis-subtitle").textContent = selectedMode === "MIXED" ? award.detail : `${selectedMode === "DIGITAL" ? "Digital" : selectedMode === "PHONE" ? "Phone" : "CW"} contacts only`;
  $("#analysis-callsign").textContent = $("#callsign").value.trim().toUpperCase() || "Not connected";
  $("#analysis-qso-total").textContent = filtered.length.toLocaleString();
  $("#analysis-confirmed-total").textContent = confirmed.length.toLocaleString();
  $("#analysis-calculated").textContent = lastCalculated;
  $("#analysis-percent").textContent = `${percentage}%`;
  $("#analysis-value").textContent = creditValue.toLocaleString();
  $("#analysis-goal").textContent = analysisGoal.toLocaleString();
  $("#analysis-ring").style.setProperty("--progress", `${percentage * 3.6}deg`);
  $("#analysis-eligibility").className = `eligibility-note ${creditValue >= analysisGoal ? "ready" : "working"}`;
  $("#analysis-eligibility").innerHTML = creditValue >= analysisGoal ? `<strong>Award level reached.</strong> Review the official award rules before submitting your paper certificate request.` : `<strong>${Math.max(0, analysisGoal - creditValue)} more credits needed.</strong> ${unconfirmedRows.length ? `${unconfirmedRows.length} ${unconfirmedRows.length === 1 ? "entity is" : "entities are"} already worked but still unconfirmed.` : "Your next confirmed contact will appear here automatically."}`;
  $("#analysis-stats").innerHTML = `<article><span>Credited entities</span><strong>${creditValue}</strong><small>Confirmed and eligible</small></article><article><span>Worked, awaiting confirmation</span><strong>${unconfirmedRows.length}</strong><small>Not yet award credit</small></article><article><span>Confirmed, missing award field</span><strong>${ineligibleConfirmed.length}</strong><small>Check ADIF details</small></article><article><span>Most common entity</span><strong>${h(mostCommon ? mostCommon.label : "—")}</strong><small>${mostCommon ? `${mostCommon.qsos.length} QSOs in view` : "No matching QSOs"}</small></article>`;
  $("#matrix-title").textContent = award.id === "vucc" ? "Grid and band status" : award.id === "was" || award.id === "triple" ? "State and band status" : award.id === "waz" ? "Zone and band status" : award.id === "wpx" ? "Prefix and band status" : "Entity and band status";
  $("#matrix-head").innerHTML = `<tr><th scope="col">${award.id === "vucc" ? "Grid" : award.id === "was" || award.id === "triple" ? "State" : award.id === "waz" ? "Zone" : award.id === "wpx" ? "Prefix" : "Entity"}</th><th scope="col">Status</th>${BAND_COLUMNS.map(band => `<th scope="col">${band.toLowerCase()}</th>`).join("")}</tr>`;
  $("#matrix-body").innerHTML = rows.length ? rows.map(row => {
    const status = row.qsos.some(isConfirmed) ? "confirmed" : row.qsos.length ? "unconfirmed" : "none";
    const cells = BAND_COLUMNS.map(band => {
      const bandQsos = row.qsos.filter(qso => bandFor(qso) === band);
      const confirmedCount = bandQsos.filter(isConfirmed).length;
      const count = confirmedCount || bandQsos.length;
      const cellStatus = confirmedCount ? "confirmed" : bandQsos.length ? "unconfirmed" : "none";
      return `<td class="matrix-cell ${cellStatus}" title="${h(row.label)} · ${band.toLowerCase()} · ${cellStatus}">${count || "·"}</td>`;
    }).join("");
    return `<tr><th scope="row">${h(row.label)}</th><td><span class="status ${status}">${status === "confirmed" ? "Confirmed" : status === "unconfirmed" ? "Unconfirmed" : "None"}</span></td>${cells}</tr>`;
  }).join("") : `<tr><td class="matrix-empty" colspan="15">No matching contacts in this view. Sync LoTW or change the Type filter.</td></tr>`;
  $("#matrix-note").textContent = catalogFor(award.id, selectedMode).length ? "This award has a fixed target list, so missing items are shown as None." : "Only entities present in the LoTW download are listed. Confirmed and unconfirmed contacts are kept separate.";
  renderAnalysisMap(filtered);
  renderAwards();
  if (scroll) section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyQsoData(qsos, calculatedLabel) {
  currentQsos = [...qsos];
  currentConfirmed = currentQsos.filter(isConfirmed);
  awards = calculateAwardProgress(currentConfirmed);
  lastCalculated = calculatedLabel;
  renderAwards();
  $("#qso-count").textContent = currentQsos.length.toLocaleString();
  $("#confirmed-count").textContent = currentConfirmed.length.toLocaleString();
  const fresh = (currentConfirmed.length ? currentConfirmed : currentQsos).sort((a, b) => `${b.QSO_DATE || ""}${b.TIME_ON || ""}`.localeCompare(`${a.QSO_DATE || ""}${a.TIME_ON || ""}`)).slice(0, 5);
  $("#feed").innerHTML = fresh.map(q => `<div class="feed-item"><span class="feed-band">${h(normalizedMode(q).slice(0,3))}</span><div><strong>${h(q.CALL)}</strong><span>${h(q.COUNTRY || "Confirmed contact")} · ${h(q.BAND || q.FREQ || "")} ${h(q.MODE || "")}</span></div><time>${q.QSO_DATE ? `${h(q.QSO_DATE.slice(4,6))}/${h(q.QSO_DATE.slice(6,8))}` : "New"}</time></div>`).join("");
  if (!$("#award-analysis").hidden) renderAwardAnalysis(selectedAwardId);
}

function applyLiveLog(adif) {
  const qsos = parseAdif(adif);
  if (!qsos.length) throw new Error("LoTW 没有返回任何 QSO。请检查 LoTW 登录信息。");
  applyQsoData(qsos, new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date()));
}

$("#connect-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  const help = $("#connection-help");
  const config = window.BETTERLOTW_CONFIG || {};
  if (!config.syncEndpoint || config.syncEndpoint.startsWith("__")) {
    help.hidden = false;
    help.innerHTML = "同步服务尚未部署。请完成 README 中的 Cloudflare 与 GitHub 配置；现在可以使用“Use demo station”。";
    return;
  }
  button.disabled = true;
  button.innerHTML = "Downloading full LoTW history…";
  help.hidden = true;
  try {
    const response = await fetch(config.syncEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: $("#callsign").value.trim(), password: $("#lotw-key").value }), cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "同步服务无法验证 LoTW 登录信息。");
    applyLiveLog(data.adif || "");
    $("#lotw-key").value = "";
    button.innerHTML = "Full history synced ✓";
    setTimeout(() => button.innerHTML = "Sync confirmations <span class='arrow'>→</span>", 2500);
  } catch (error) {
    help.hidden = false;
    help.textContent = error.message;
    button.innerHTML = "Try sync again";
  } finally {
    button.disabled = false;
  }
});

$("#award-grid").addEventListener("click", event => {
  const button = event.target.closest("[data-analyze]");
  if (button) renderAwardAnalysis(button.dataset.analyze, true);
});
$("#analysis-mode").addEventListener("change", event => { selectedMode = event.target.value; renderAwardAnalysis(selectedAwardId); });
$("#analysis-paper-button").addEventListener("click", () => { $("#paper-award").value = selectedAwardId; $("#paper-dialog").showModal(); });
$("#demo-button").addEventListener("click", setDemo);
$("#sort-button").addEventListener("click", () => { awards.sort((a,b) => (b.value / b.goal) - (a.value / a.goal)); renderAwards(); });
$("#paper-button").addEventListener("click", () => $("#paper-dialog").showModal());
$(".dialog-close").addEventListener("click", () => $("#paper-dialog").close());

renderAwards();
renderFeed();
