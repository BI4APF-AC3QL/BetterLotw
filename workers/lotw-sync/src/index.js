const LOTW_REPORT_URL = "https://lotw.arrl.org/lotwuser/lotwreport.adi";
const MAX_ADIF_BYTES = 12 * 1024 * 1024;
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

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (new URL(request.url).pathname !== "/sync") return response(request, env, { error: "Not found" }, 404);
    if (!cors) return response(request, env, { error: "This website is not allowed to use the sync service." }, 403);
    if (request.method !== "POST") return response(request, env, { error: "Method not allowed" }, 405);
    try {
      const { username, password } = await request.json();
      if (!/^[A-Z0-9/]{3,20}$/i.test(username || "") || typeof password !== "string" || password.length < 1 || password.length > 256) return response(request, env, { error: "请输入有效的 LoTW 用户名和密码。" }, 400);
      // LoTW separates the complete uploaded-QSO list from confirmed-QSL
      // details. Fetch both from the beginning of account history; the client
      // joins them by APP_LoTW_QSO_TIMESTAMP without double-counting QSOs.
      const common = {
        login: username.trim(), password, qso_query: "1", qso_qsl: "no",
        qso_qsorxsince: "1900-01-01"
      };
      const qsoQuery = new URLSearchParams(common);
      const qslQuery = new URLSearchParams({
        ...common, qso_qsl: "yes", qso_qslsince: "1900-01-01",
        qso_qsldetail: "yes"
      });
      qslQuery.delete("qso_qsorxsince");
      const fetchReport = query => fetch(`${LOTW_REPORT_URL}?${query}`, {
        method: "GET",
        headers: { "User-Agent": "BetterLoTW/1.0", "Accept": "application/x-arrl-adif, text/plain;q=0.9" },
        cf: { cacheTtl: 0, cacheEverything: false }
      });
      // LoTW may reject concurrent report generation for the same account, so
      // keep these upstream requests deliberately sequential.
      const qsoResponse = await fetchReport(qsoQuery);
      if (!qsoResponse.ok) return response(request, env, { error: "LoTW 暂时无法响应，请稍后重试。" }, 502);
      const adif = await qsoResponse.text();
      const qslResponse = await fetchReport(qslQuery);
      if (!qslResponse.ok) return response(request, env, { error: "LoTW 暂时无法响应，请稍后重试。" }, 502);
      const qslAdif = await qslResponse.text();
      const encoder = new TextEncoder();
      if (encoder.encode(adif).byteLength > MAX_ADIF_BYTES || encoder.encode(qslAdif).byteLength > MAX_ADIF_BYTES) return response(request, env, { error: "完整日志超过同步服务的安全大小限制。请联系我们启用分批同步。" }, 413);
      if (!/<eoh>|<eor>/i.test(adif) || !/<eoh>|<eor>/i.test(qslAdif)) return response(request, env, { error: "LoTW 没有返回 ADIF 数据。请检查用户名和密码。" }, 401);
      return response(request, env, { adif, qslAdif });
    } catch {
      return response(request, env, { error: "请求格式无效或 LoTW 同步失败。" }, 400);
    }
  }
};
