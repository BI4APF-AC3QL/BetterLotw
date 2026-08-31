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
const $ = (selector) => document.querySelector(selector);
function renderAwards(items = awards) {
  $("#award-grid").innerHTML = items.map(a => `<article class="award-card ${a.featured ? "featured" : ""}"><div class="award-top"><div class="award-icon">${a.icon}</div><span class="award-type">${a.type}</span></div><h3 class="award-name">${a.name}</h3><p class="award-detail">${a.detail}</p><div class="progress-row"><span class="progress-number">${a.value}<small> / ${a.goal}</small></span><span class="progress-pill">${a.level}</span></div><div class="progress-bar"><i style="width:${Math.min(100, a.value / a.goal * 100)}%"></i></div></article>`).join("");
  $("#paper-award").innerHTML = awards.map(a => `<option value="${a.id}">${a.name} — ${a.value}/${a.goal} credits</option>`).join("");
}
function renderFeed() { $("#feed").innerHTML = confirmations.map(c => `<div class="feed-item"><span class="feed-band">${c[2]}</span><div><strong>${c[0]}</strong><span>${c[1]}</span></div><time>${c[3]}</time></div>`).join(""); }
function setDemo() { $("#callsign").value = "JR1BTR"; $("#confirmed-count").textContent = "1,284"; $("#connection-help").hidden = true; $("#sync-card").scrollIntoView({ behavior: "smooth", block: "center" }); }
function parseAdif(adif) {
  return adif.split(/<eor>/i).filter(Boolean).map(record => {
    const result = {}; const tag = /<([^:>]+):(\d+)(?::[^>]+)?>/gi; let match;
    while ((match = tag.exec(record))) { const name = match[1].trim().toUpperCase(); const length = Number(match[2]); const start = tag.lastIndex; result[name] = record.slice(start, start + length).trim(); tag.lastIndex = start + length; }
    return result;
  }).filter(qso => qso.CALL && (qso.QSL_RCVD === "Y" || qso.QSLRDATE));
}
function normalizedMode(qso) { const mode = (qso.MODE || "").toUpperCase(); return ["FT8", "FT4", "JT65", "JT9", "PSK", "RTTY", "MFSK", "MSK144"].some(v => mode.startsWith(v)) ? "DIGITAL" : mode === "SSB" || mode === "AM" || mode === "FM" ? "PHONE" : mode; }
function calculateAwardProgress(qsos) {
  const unique = (values) => new Set(values.filter(Boolean));
  const dxcc = unique(qsos.map(q => q.DXCC).filter(code => /^\d+$/.test(code) && code !== "0")).size;
  const states = unique(qsos.filter(q => q.DXCC === "291" || /UNITED STATES/i.test(q.COUNTRY || "")).map(q => (q.STATE || "").toUpperCase())).size;
  const grids = unique(qsos.map(q => (q.GRIDSQUARE || "").slice(0, 4).toUpperCase()).filter(grid => /^[A-R]{2}\d{2}$/.test(grid))).size;
  const zones = unique(qsos.map(q => q.CQZ)).size;
  const prefixes = unique(qsos.map(q => q.PFX || "")).size;
  const triple = ["CW", "PHONE", "DIGITAL"].reduce((total, mode) => total + unique(qsos.filter(q => normalizedMode(q) === mode && (q.DXCC === "291" || /UNITED STATES/i.test(q.COUNTRY || ""))).map(q => (q.STATE || "").toUpperCase())).size, 0);
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
function applyLiveLog(adif) {
  const qsos = parseAdif(adif); if (!qsos.length) throw new Error("没有找到已确认的 QSO。请确认 LoTW 账号有已确认记录。");
  awards = calculateAwardProgress(qsos); renderAwards(); $("#confirmed-count").textContent = qsos.length.toLocaleString();
  const fresh = qsos.sort((a, b) => `${b.QSO_DATE || ""}${b.TIME_ON || ""}`.localeCompare(`${a.QSO_DATE || ""}${a.TIME_ON || ""}`)).slice(0, 5);
  $("#feed").innerHTML = fresh.map(q => `<div class="feed-item"><span class="feed-band">${normalizedMode(q).slice(0,3)}</span><div><strong>${q.CALL}</strong><span>${q.COUNTRY || "Confirmed contact"} · ${q.BAND || q.FREQ || ""} ${q.MODE || ""}</span></div><time>${q.QSO_DATE ? `${q.QSO_DATE.slice(4,6)}/${q.QSO_DATE.slice(6,8)}` : "New"}</time></div>`).join("");
}
$("#connect-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const button = event.submitter; const help = $("#connection-help"); const config = window.BETTERLOTW_CONFIG || {};
  if (!config.syncEndpoint || config.syncEndpoint.startsWith("__")) { help.hidden = false; help.innerHTML = "同步服务尚未部署。请完成 README 中的 Cloudflare 与 GitHub 配置；现在可以使用“Use demo station”。"; return; }
  button.disabled = true; button.innerHTML = "Syncing confirmations…"; help.hidden = true;
  try { const response = await fetch(config.syncEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: $("#callsign").value.trim(), password: $("#lotw-key").value }), cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "同步服务无法验证 LoTW 登录信息。"); applyLiveLog(data.adif || ""); $("#lotw-key").value = ""; button.innerHTML = "Synced successfully ✓"; setTimeout(() => button.innerHTML = "Sync confirmations <span class='arrow'>→</span>", 2500); } catch (error) { help.hidden = false; help.textContent = error.message; button.innerHTML = "Try sync again"; } finally { button.disabled = false; }
});
$("#demo-button").addEventListener("click", setDemo);
$("#sort-button").addEventListener("click", () => { awards.sort((a,b) => (b.value / b.goal) - (a.value / a.goal)); renderAwards(); });
$("#paper-button").addEventListener("click", () => $("#paper-dialog").showModal());
$(".dialog-close").addEventListener("click", () => $("#paper-dialog").close());
renderAwards(); renderFeed();
