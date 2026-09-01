# BetterLoTW

A QRZ-inspired dashboard for viewing LoTW-confirmed QSO progress across DXCC, WAS, VUCC, Triple Play, WAZ, and WPX. It includes a visual entity map and a guided hand-off to ARRL's official paper-award process.

## Run locally

Open `index.html` in a browser, or serve this directory with any static web server. The included station is demo data; use **Connect your log** to configure live sync.

## 生产环境完整配置

LoTW 的 ADIF 下载接口不允许浏览器跨域请求，因此 GitHub Pages 必须配合已包含在本仓库中的 Cloudflare Worker。Worker 只在单次 HTTPS 请求中转发用户输入的 LoTW 凭据，不会记录或保存密码。

```js
window.BETTERLOTW_CONFIG = { syncEndpoint: "https://你的-worker.workers.dev/sync" };
```

### 第一次部署 Worker

1. 注册或登录 [Cloudflare](https://dash.cloudflare.com/)，在 **My Profile → API Tokens** 创建一个可编辑 Workers 的 API Token，并复制 Account ID。
2. 在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加以下两个 **Secrets**：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. 推送代码。`Deploy LoTW sync Worker` 工作流会创建 `betterlotw-lotw-sync` Worker。
4. 在 Cloudflare 的 Worker 页面复制 Worker URL，例如 `https://betterlotw-lotw-sync.你的账户.workers.dev/sync`。
5. GitHub **Settings → Secrets and variables → Actions → Variables** 添加：
   - `LOTW_SYNC_ENDPOINT`：上一步完整 `/sync` URL
6. 在 Cloudflare Worker 的 **Settings → Variables and Secrets** 添加 Secret：
   - `ALLOWED_ORIGIN`：你的 GitHub Pages 网站根域名，例如 `https://你的用户名.github.io`

仓库当前使用的 `https://bi4apf-ac3ql.github.io` 已内置在 Worker 的精确白名单中，因此即使 Cloudflare 变量尚未设置，当前 GitHub Pages 网站也可以同步。如果以后使用自定义域名，可在 `ALLOWED_ORIGIN` 中填写该域名；多个域名使用英文逗号分隔，均不要包含结尾 `/`。

重新运行 `Deploy BetterLoTW to GitHub Pages` 工作流后，网页便会使用该 Worker。Worker 使用 LoTW 要求的 GET 报告查询，并明确设置 `qso_qsl=no` 与从 1900 年开始的接收日期，以取得全部已上传 QSO；返回记录中的 `QSL_RCVD`/`QSLRDATE` 用于识别确认。页面会分别显示同步 QSO 总数与已确认 QSO 数，奖项仅以确认记录计算。

## Publish with GitHub Pages

1. 在 GitHub 新建空仓库，然后把它作为 `origin`。
2. 提交并推送 `main` 分支。
3. GitHub 仓库中打开 **Settings → Pages → Build and deployment → Source: GitHub Actions**。
4. 每次推送都会运行部署。完成后可在 workflow 摘要中看到公开网址。

### 安全边界

- 不要把 LoTW 密码写入 `config.js`、GitHub Secret、Worker 变量或代码仓库。
- `ALLOWED_ORIGIN` 必须是你自己的页面域名，不含结尾 `/`。
- 这是一项非官方独立工具；最终奖项资格、费用与纸质证书仍以 ARRL 审核为准。

Award eligibility, applications, fees, and paper-certificate fulfillment remain with the official ARRL award program. BetterLoTW is an independent companion and is not affiliated with ARRL or QRZ.
