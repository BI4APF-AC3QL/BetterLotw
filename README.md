# BetterLoTW

一个默认中文、以功能为主的 LoTW 奖项工作台。页面会分别显示完整 QSO、LoTW 已确认 QSO、待确认 QSO，并计算 DXCC、WAS、VUCC、Triple Play、WAZ 与 WPX 进度。

DXCC 分析使用与 QRZ 奖项页相似的交互逻辑：地图和明细矩阵同步显示“已确认 / 待确认 / 无”，支持状态筛选、地图缩放拖动、实体提示和地图到表格的联动。界面与地图资产均为本项目独立实现，不复制 QRZ 品牌或私有数据。

## Run locally

使用任意静态网页服务器运行本目录，然后在页面中点击“载入示例数据”即可检查全部界面功能。实时数据需要配置下方 Cloudflare Worker。

### 实体目录与推断边界

- `dxcc-catalog.js` 由公开的 [Country Files](https://www.country-files.com/) `cty.csv` 数据生成，包含当前 DXCC 实体中心位置与呼号前缀。
- `world-map.js` 使用 [Natural Earth](https://www.naturalearthdata.com/) 1:110m 真实国家边界数据（公有领域）。地图按实体中心位置将“已确认 / 待确认 / 无”覆盖到实际国家轮廓；小型岛屿或没有对应边界的 DXCC 实体保留圆点显示。
- LoTW 的“全部 QSO”报告通常不含 DXCC、国家、CQ 区和网格字段，因此待确认 QSO 的实体与 CQ 区通过最长呼号前缀进行推断，并在页面明确标记为“前缀推断”。
- 州和 Maidenhead 网格无法从普通呼号可靠推断，BetterLoTW 不会伪造这些字段；无法推断的记录仍会出现在待确认 QSO 列表中。
- 地图圆点表示实体中心位置，不是国界着色图，也不用于判断奖项的正式实体有效日期。

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

重新运行 `Deploy BetterLoTW to GitHub Pages` 工作流后，网页便会使用该 Worker。Worker 使用 LoTW 要求的 GET 报告查询：以 `qso_qsl=no` 取得全部已上传 QSO，并以 `qso_qsl=yes` 取得完整确认与奖项字段。浏览器会分别按互不重叠的日期窗口串行下载两类报告，显示实际下载进度；若单个窗口超过 12 MiB，自动二分为更小的日期范围后继续。浏览器按 LoTW 的 QSO 时间戳合并两类报告；页面分别显示同步 QSO 总数与已确认 QSO 数，奖项仅以确认详情记录计算。若只需原始日志，可使用“下载全部 QSO（ADIF）”，它会以单次请求直接下载 LoTW 的完整 QSO 报告，不参与页面分析。

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
