# 本地认证限流

仅供开发环境联调，不是已上线的完整账号安全方案。没有推送、部署或修改 Supabase 云端配置。原有首页、Tally、咨询与工单业务保持不变。

## 请求处理

浏览器的登录、注册、找回密码、重发确认邮件统一 POST 到 `/auth-preview/action`。后端验证 Origin、请求大小及字段，再执行 Upstash 限流，最后才创建 Supabase SSR client 并执行认证操作。

该路径跳过原有会话中间件的自动刷新，避免限流前就请求 Supabase。认证成功后的 Cookie 与 PKCE verifier Cookie 仍由已有 Supabase SSR 服务端集成写入；不在 JSON 响应中返回 access token、refresh token 或完整用户记录。

这四个操作不再由浏览器直接调用 Supabase。退出登录及修改密码暂时沿用原有实现，不在本轮四个入口的范围内。

接口仅在 `NODE_ENV=development` 可用；其他环境返回 404，不自动回退到不限流的直连路径。没有 HTTP 参数或调试接口可跳过限流。

## 本地来源模型与规则

所有本地浏览器共享固定来源 `local-test-source`。不相信请求提供的 IP、X-Forwarded-For、Cookie 或来源字段，不声称已经实现真实 IP 识别。

| 规则 | 初始额度 |
| --- | --- |
| 登录来源总量 | 30 次 / 10 分钟 |
| 登录来源下的邮箱 | 10 次 / 10 分钟 |
| 注册来源总量 | 5 次 / 小时 |
| 所有邮件操作的来源总量 | 10 次 / 10 分钟 |
| 同一邮箱共享邮件冷却 | 每 60 秒允许一次 |
| 同一邮箱共享邮件额度 | 5 次 / 小时 |

注册、找回密码、重发确认邮件共享邮件规则，不能通过切换操作避开冷却。计数保守地记录请求尝试，包括后续 Supabase 失败的请求；不会因为服务失败返还额度。来源级额度先检查，邮件冷却后才消耗邮箱小时额度，因此冷却期间的重复请求不会一直消耗邮箱小时额度。

冷却使用容量为 1 的 token bucket；其他次数额度使用官方 sliding window 算法，属于加权近似滑动窗口，不是逐条请求日志的精确滚动窗口。规则定义集中在 `lib/auth-protection/policy.ts`。

限制为临时限制，不永久锁号。多个本地测试者共用来源额度是已知限制，不是生产方案。

## 数据与故障处理

- 使用 `@upstash/ratelimit` 和 `@upstash/redis`。Redis 不保存密码、明文邮箱或 Session。
- 邮箱去掉首尾空格并统一小写，再使用服务端私有 Token 做带独立用途标记的 HMAC-SHA256；Token 本身不会写入 Redis key。更换 Token 会改变邮箱摘要。
- 应用前缀为 `xunneng:auth-preview:local:v1`；自动测试使用独立 UUID 前缀 `xunneng:auth-preview:local:test:...`。SDK 计数自动过期，最长约两小时加一秒。
- 不启用 analytics、Traffic Protection 自动黑名单或设备指纹。SDK 缓存只缓存拒绝结果以减少重复 Redis 调用。
- 超限返回 429、`Retry-After` 和等待秒数；页面显示倒计时并禁用提交，倒计时结束恢复操作。
- Redis 错误或超时返回 503，并提示稍后重试，不调用 Supabase。特别处理 SDK 超时返回 `success=true, reason=timeout` 的默认放行语义。
- 请求限制为 4 KB，错误响应不暴露原始服务异常、密钥或账号是否存在。
- Upstash 在云端：本地测试仍会消耗少量云端 Redis 命令，并不是离线测试。

## 环境

项目根目录 `.env`：

```dotenv
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-read-write-token
# 可选；当前代码默认就是这个测试地址
AUTH_PREVIEW_ORIGIN=http://192.168.1.176:3003
```

这些配置均不使用 `NEXT_PUBLIC_`。从 `http://192.168.1.176:3003/auth-preview` 测试；其他 Origin 的认证提交返回 403。回调地址也取自该服务端配置，不接受浏览器任意指定回跳地址。

不自动启动或重启项目。若需要启动，由用户执行 `npm run dev -- -p 3003`。HTTP 仅用于可信局域网测试，真实上线必须使用 HTTPS。

## 可重复测试

```bash
# 模拟服务测试：无云端请求，无 Redis 写入，无真实邮件
npm run test:auth

# 真实 Upstash + 模拟认证：产生隔离、自动过期的计数，不发送邮件
npm run test:auth:redis

npx tsc --noEmit
npx tsc --noEmit -p tsconfig.auth-tests.json
npx eslint app/auth-preview lib/auth-protection lib/supabase-auth/middleware.ts tests/auth-protection.test.ts tests/auth-protection.redis.test.ts
```

测试覆盖正常放行、超限时不执行认证、缺配置/故障时拒绝、超时默认放行的纠正、Origin 与请求体校验、邮箱摘要、四个操作的共享策略，以及实际 Supabase SDK 写入模拟 session/PKCE Cookie。

真实 Redis 测试覆盖第 11 次登录拦截、新 limiter 实例仍被拦截、注册与重置邮件共享冷却、第 6 个注册请求拦截、并发冷却、自动到期恢复、每邮箱小时额度。到期恢复用独立测试实例的 3 秒冷却验证，不缩短实际接口的 60 秒配置。

另已通过现有 3003 服务做浏览器测试：为一个随机虚构邮箱预置满额计数后，真实页面请求返回 429，刷新后仍为 429；模拟 429/503 验证按钮冷却与恢复，模拟注册/找回密码成功提示，以及手机布局。未发送真实邮件、未创建账号。实际收信、真实登录后的完整会话生命周期、真实改密仍需使用用户测试账号人工联调。

## 仍未解决的生产边界

Supabase 公开认证接口仍可被直接调用，本地 API 限流不会自动关闭它。真实 IP 信任链、Supabase 原生限流与 CAPTCHA、反向代理或 WAF、生产额度和可用性策略，上线前需要另行设计与验证。

本次按 redis-js skill 采用官方限流库，并按 Supabase skill 保留 Cookie/PKCE 集成与密钥隔离。[Upstash 接入](https://upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted)、[超时与缓存行为](https://upstash.com/docs/redis/sdks/ratelimit-ts/features)、[Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)。
