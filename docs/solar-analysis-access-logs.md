# 光伏分析授权访问日志

## 行为

- 仅 `/solar-analysis` 的普通密码（audited 模式）/Cookie 校验通过、分析页面在浏览器实际挂载后尝试记录。
- 专用密码（private 模式）不挂载审计组件；后台接口也直接返回 204，绝不尝试数据库写入。网页版两种密码的 Vercel Analytics 均保持开启。
- `/pwa` 下载页和 `/pwa/app` 离线应用均不记录审计，也不发送 Vercel Analytics。旧 `offline-shell` 查询参数不再影响网页版审计。
- 正确密码首次进入、已有 Cookie 再次打开、F5 刷新、离开后返回都算新访问。
- `pageshow.persisted` 表示从浏览器 BFCache 恢复，算新访问；普通 `pageshow` 不重复记。
- 密码错误、密码输入页、Next.js 预加载、其他页面不记；修改参数、月份、模型不记。
- 每次访问只发一次请求。React Strict Mode 的 effect 重放不重复发送；不重试网络/HTTP/数据库错误，不写失败日志。
- 前端不等待日志结果，接口未返回也能操作分析。前端请求最长 6 秒、后台数据库请求最长 3 秒；两者都不重试。网络拦截、关闭页面、脚本未执行等情况可能漏记，这是用户确认的 best-effort 策略。

## 数据与权限

Migration：`supabase/migrations/20260916161424_add_solar_analysis_access_logs.sql`。
新增 `public.solar_analysis_access_logs`，不修改现有业务表、密码或访问 Cookie。

| 字段 | 说明 |
| --- | --- |
| `id` | 浏览器自动生成的 UUID，仅供记录去重；不是已有用户 ID、账号或验证凭据 |
| `accessed_at` | 数据库生成的 `timestamptz`，UTC 时间，可查询时换时区 |
| `page_path` | 服务端固定 `/solar-analysis` |
| `ip_address` | Vercel 可信请求头中的 IP，支持 IPv4/IPv6；本地、非 Vercel 或不合法时 NULL |
| `user_agent` | 请求中的浏览器/系统信息，最多 1024 字符；不等于可验证的真实身份 |
| `environment` | production / preview / development，区分测试和正式访问 |

RLS 开启，撤销 public、anon、authenticated 的表权限。只有服务端 service_role 可以 SELECT / INSERT，不能 UPDATE / DELETE。
重复 UUID 使用 `ON CONFLICT DO NOTHING`，不会更新原访问时间。数据库不保存密码、Cookie、失败原因、计算参数或完整请求头。
现阶段没有日志展示页或自动清理任务。可在 Supabase 管理后台查询；保留期限与清理需另行确认。

```sql
select accessed_at, ip_address, user_agent, environment
from public.solar_analysis_access_logs
order by accessed_at desc
limit 100;
```

## 实现与配置

- 前端 `SolarVisitTracker` 只在解锁分支挂载，使用原生 fetch，不引入浏览器 Supabase SDK。
- `POST /solar-analysis/visit` 在当前 Cookie 的 `/solar-analysis` Path 内，再次验证密码 Cookie、同源来源、JSON 类型和最大 512 字节的请求体。
- 前端只能传内部 `id`；IP、User-Agent、路径、环境由服务端取得，时间由数据库生成。
- 后台直接调用 Supabase REST 执行一次 INSERT，使用既有 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`，密钥不下发。
- 来源校验沿用配置的 `SITE_URL` / Vercel 部署域名；SITE_URL 未设置时使用官网 `https://www.solortide.com`。非官网自定义域名须配置 SITE_URL。本地开发额外允许当前同源地址。
- 写入失败仍返回 204，表示已处理尝试，不保证数据库成功。页面不显示日志错误或重试按钮。

## 验证

`npm test` 包括成功授权、错误 Cookie、不可信来源、请求大小/字段校验、可信 IP、后台故障、去重发送和 migration 权限约束。

浏览器测试拦截日志请求，不写云端数据，验证手机/桌面以及刷新、返回、Strict Mode、BFCache 事件、错误/断网/请求未完成时仍可操作：

```sh
PLAYWRIGHT_MODULE=/path/to/playwright SOLAR_LOG_TEST_ORIGIN=http://127.0.0.1:3003 \
node --env-file=.env --env-file=.env.local --conditions=react-server --import tsx tests/solar-access-log.browser.cjs
```

默认注入既有授权 Cookie。需要验证首次正确密码提交时，额外设置 `SOLAR_LOG_TEST_PASSWORD` 为测试服务配置的密码，不在输出中打印密码。

真实数据库验收须显式启用；校验 linked 项目与应用数据库一致，只保留一条带 `solar-access-log-live-test/` 标记的合成记录，使用文档示例 IP，不发送任何业务表单或邮件：

```sh
SOLAR_ACCESS_LOG_LIVE_TEST=1 node --env-file=.env --env-file=.env.local \
  --conditions=react-server --import tsx scripts/test-solar-access-log-live.ts
```

本次通过 migration 应用至既有 linked 项目。本地/云端迁移历史一致，security advisors 无 warn/error；RLS 开启，公开读写均拒绝，后台只具备 SELECT/INSERT。
自动化测试共 179 项通过，独立生产构建通过；开发/生产模式均完成手机（390px）和桌面（1440px）浏览器回归，生产模式还验证了正确密码表单首次进入。测试服务已停止，未重启现有开发服务。
真实数据库验证通过授权写入、同 UUID 去重、错误 Cookie 不入库、anon REST 读写拒绝。
2026-09-18 按用户要求清理上述表的 36 条历史记录（含合成记录），删除后核验为 0 条；没有改表结构、权限、其他业务数据或 Vercel Analytics。通过管理端仅删除已核对时间范围内的数据，没有放宽 service_role 的 DELETE 权限，也没有创建会在其他环境自动删日志的 migration。网页按既有 main 分支发布流程上线。
