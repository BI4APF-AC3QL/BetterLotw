const LOTW_REPORT_URL = "https://lotw.arrl.org/lotwuser/lotwreport.adi";
const MAX_ADIF_BYTES = 12 * 1024 * 1024;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BUILT_IN_ALLOWED_ORIGINS = new Set([
  "https://bi4apf-ac3ql.github.io"
]);

function allowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return new Set([...BUILT_IN_ALLOWED_ORIGINS, ...configured]);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!allowedOrigins(env).has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function response(request, env, body, status = 200) {
  const headers = corsHeaders(request, env) || {};
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json; charset=UTF-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

function validDate(value) {
  if (!DATE_PATTERN.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (new URL(request.url).pathname !== "/sync") return response(request, env, { error: "Not found" }, 404);
    if (!cors) return response(request, env, { error: "This website is not allowed to use the sync service." }, 403);
    if (request.method !== "POST") return response(request, env, { error: "Method not allowed" }, 405);
    try {
      const { username, password, report, from, to } = await request.json();
      if (!/^[A-Z0-9/]{3,20}$/i.test(username || "") || typeof password !== "string" || password.length < 1 || password.length > 256) return response(request, env, { error: "请输入有效的 LoTW 用户名和密码。" }, 400);
      if (!["qso","qsl"].includes(report) || !validDate(from) || !validDate(to) || from > to) return response(request, env, { error: "分批同步的日期范围无效。" }, 400);
      // qso_qsorxsince and qso_qslsince select LoTW upload/match timestamps;
      // they do not accept an upper bound. QSO-date windows must instead use
      // qso_startdate/qso_enddate, which work for both report kinds.
      // Keeping requests serial lets the browser show progress and lets an
      // oversized window be split without duplicating records.
      const common = { login:username.trim(), password, qso_query:"1" };
      const query = new URLSearchParams(report === "qso"
        ? { ...common, qso_qsl:"no", qso_qsorxsince:"1900-01-01", qso_startdate:from, qso_enddate:to }
        : { ...common, qso_qsl:"yes", qso_qslsince:"1900-01-01", qso_startdate:from, qso_enddate:to, qso_qsldetail:"yes" }
      );
      const fetchReport = query => fetch(`${LOTW_REPORT_URL}?${query}`, {
        method: "GET",
        headers: { "User-Agent": "BetterLoTW/1.0", "Accept": "application/x-arrl-adif, text/plain;q=0.9" },
        cf: { cacheTtl: 0, cacheEverything: false }
      });
      const reportResponse = await fetchReport(query);
      if (!reportResponse.ok) return response(request, env, { error: "LoTW 暂时无法响应，请稍后重试。" }, 502);
      const adif = await reportResponse.text();
      const encoder = new TextEncoder();
      if (encoder.encode(adif).byteLength > MAX_ADIF_BYTES) return response(request, env, { error: "这一时间段的数据量超过单批大小限制，将自动拆分后重试。", rangeTooLarge:true }, 413);
      if (!/<eoh>|<eor>/i.test(adif)) return response(request, env, { error: "LoTW 没有返回 ADIF 数据。请检查用户名和密码。" }, 401);
      return response(request, env, { report, from, to, adif });
    } catch {
      return response(request, env, { error: "请求格式无效或 LoTW 同步失败。" }, 400);
    }
  }
};
