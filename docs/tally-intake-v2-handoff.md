# Tally 咨询表单改版交接说明（V2）

日期：2026-09-14

最新进展：已收到新版表单 `9q8RYQ`，本地已配置嵌入。基础字段满足要求，仍待国家条件显示修复及真实 Webhook key 回传。详见 [该表单检查结果](./tally-9q8RYQ-review.md)。以下部署状态中的“未启用接收”仍有效。

## 当前状态与分工

网站侧已实现无地图咨询流程、地区入口保护、国家嵌入参数、旧登录/测试入口禁用。新项目的表和 Webhook 已部署，并通过虚构字段的真实写入测试。**尚未配置新版 Tally 的实际字段，接收端当前主动关闭（POST 返回 503），不能直接切换。** Tally agent 负责表单修改并回传字段 ID 和测试数据。用户不再需要账号登录；不兼容旧地图字段及旧测试预览链接。

不要更换现有生产 Webhook、删除旧表单数据或自行修改 Supabase。可先制作未切换生产入口的新版表单；如会修改当前线上表单，先确认发布时机，避免旧网站仍传 location_json 时中断填写。

## 1. 国家传递协议（固定）

网站现有 localStorage 键：`sol-tide:installation-region:v1`。

其值是字符串 `AG` 或 `DM`，不是 JSON 对象，也不是国家名称。

Tally 新增隐藏字段，准确名称必须为 `installation_country`：

| 隐藏值 | 在 Tally 向用户显示的名称 |
| --- | --- |
| AG | Antigua and Barbuda |
| DM | Dominica |

网站会传入 `https://tally.so/embed/<FORM_ID>?installation_country=AG`（另有常规嵌入样式参数）。Tally 无法直接读取宿主网站的 localStorage，不要尝试在嵌入表单中读取它。

在基础信息部分顶部展示 `Installation country: Antigua and Barbuda` 或 `Installation country: Dominica`。用条件显示分别展示两段完整文案，不要直接显示 AG/DM，不要新增用户国家选择框。若当前 Tally 能力无法实现，请先反馈，不擅自改为用户重新选择。

缺失或不为 AG/DM：不能默认选一个国家，应显示英文提示 `Please select your installation country on our website before completing this form.`，提供网站首页链接；尽可能阻止继续提交，并说明具体实现和限制。Webhook 会独立拒绝无效国家。

网站目标行为：访问 `/consultation` 时等待读取 localStorage；无有效国家则返回首页并要求选择，期间不加载表单。选择国家后正常发起咨询。正式路径是 `/consultation`，不是 `/consulation`。

## 2. 基础信息字段

以下“逻辑名”是交接与后端映射名称，不要求把它当作用户可见标题。请回传各字段在 Webhook `data.fields[]` 中真实的 `key`；后端按 key 提取，不通过标题猜测。

| 逻辑名 | 英文标题 | 类型 | 必填 | 约定 |
| --- | --- | --- | --- | --- |
| installation_country | installation_country | Hidden field | 有效值必须存在 | AG / DM |
| name | Full name | Short answer | 是 | 普通文本 |
| email | Email address | Email | 是 | 用户联系邮箱 |
| phone | Phone number | Phone 或 Short answer | 是 | 包含国际区号，必须作为字符串保存 |
| parish | Parish | Short answer | 是 | 用户自行填写，不查询 Google |
| town | Town / Village | Short answer | 是 | 普通文本 |
| street | Street / Area | Short answer | 是 | 允许片区或道路名称，不强制正规门牌 |
| building | House / Building | Short answer | 否 | 普通文本 |
| directions | Landmark / Directions | Long answer | 否 | 保留换行 |

电话辅助说明：`Include your country code, for example +1 268… for Antigua and Barbuda or +1 767… for Dominica.` 用户可使用其他国家联系电话，不要把电话区号锁定为安装国家。不能用 Number 字段，不做短信验证。

不新增强制邮编、地图选点、地址确认、Google 自动补全或账号登录。保留原有电费、用电需求等业务问题，不随本次改版擅自删除。表单标题、提示和成功文案均使用英文。

旧 `location_json`、经纬度等字段不再作为新版表单依赖；不能要求用户手写 JSON。地址合并完全由 Webhook 负责。

## 3. 新 Supabase 的目标保存结构（网站侧实现）

国家、姓名、邮箱和电话独立列保存。地址组成 JSONB。完整原始事件另存 payload，保留其他业务问题和附件信息，不主动下载附件。

```json
{
  "country_code": "DM",
  "country_name": "Dominica",
  "name": "Example Customer",
  "email": "customer@example.com",
  "phone": "+1 767 000 0000",
  "address": {
    "parish": "Saint George",
    "town": "Roseau",
    "street": "Example Area",
    "building": null,
    "directions": "Near the main road\nBlue entrance"
  }
}
```

以上为虚构测试数据，不代表真实可联系号码或地址。国家名称由后端根据代码生成，不信任客户端传入的名称。必填文本去掉首尾空格；地址内部换行保留；未填选填项为 null。预览需要完整地址时再拼接，跳过 null。

另保存 form_id、submission_id、提交时间、服务端接收时间和完整 payload。以 form_id + submission_id 去重，重复推送不产生新记录、不覆盖原记录。不要求生成 PDF 或旧测试预览 URL 才能入库。

## 4. Webhook 交接（等部署验证后再启用）

新项目：`thiqsnscgdjwihcfpomw`。

已部署接收地址（尚待真实表单配置后启用）：

```text
https://thiqsnscgdjwihcfpomw.supabase.co/functions/v1/tally-webhook
```

**已部署且模拟事件实测通过，但尚未启用正式接收。勿直接替换生产 Webhook。**

- 使用 Tally 原生 FORM_RESPONSE 事件和默认 JSON 请求体，不需要 Tally agent 手工拼接新的 JSON。
- 配置 Tally 原生 Signing secret；后端校验 `Tally-Signature`（HMAC-SHA256、Base64，按 Tally 官方文档）。
- 接收 URL 不附加 `?secret=...`；不把 Supabase service-role key、数据库密码或 JWT 配置到 Tally。
- 签名密钥由双方安全交接，不写进此文档、仓库、普通日志或公开 URL。
- 后端配置允许的 formId 和字段 key 映射；如果复制表单导致 formId/key 变化，必须全部回传更新。
- 回传的配置对象原样用于服务器 `TALLY_INTAKE_CONFIG`；完成联调后才设置 `TALLY_INTAKE_ENABLED=true`。
- 网站用新的 `NEXT_PUBLIC_TALLY_INTAKE_FORM_ID` 指定新版表单。本地已设为 `9q8RYQ`；缺少此配置的环境仍显示准备中，绝不自动回退到旧表单。
- 本轮验收核心是接收、校验、保存及重试去重。自动确认邮件尚未配置验证，不要在表单承诺已经发送确认邮件。
- Tally 原生自动重试保留，不需要另建自动化转发服务。

官方参考：https://tally.so/help/webhooks

## 5. Tally agent 完成后须回传

1. 最终表单链接和 formId；说明是否复制了新表单、是否已发布。
2. 所有本说明基础信息字段的真实 Webhook key 和类型，用以下格式回传：

```json
{
  "formId": "实际表单ID",
  "fields": {
    "installation_country": "实际question_key",
    "name": "实际question_key",
    "email": "实际question_key",
    "phone": "实际question_key",
    "parish": "实际question_key",
    "town": "实际question_key",
    "street": "实际question_key",
    "building": "实际question_key",
    "directions": "实际question_key"
  }
}
```

3. AG、DM 各一份虚构资料的原始 Webhook 请求体。不要用真实客户资料；若包含带访问令牌的 PDF/预览链接请脱敏。
4. 两个国家的展示截图；缺失/无效国家时的表现及能否阻止提交。
5. 必填项、电话保留 `+`、选填地址为空、Directions 多行文本的测试结果。

## 6. 切换验收顺序

先完成字段配置和回传 → 网站侧部署新表/接收端并配置真实 key → 对新端点联调 AG/DM、无效签名、无效国家、缺失必填、重复事件 → 验证数据库提取结果和权限 → 协调网站与 Tally 发布。

部署测试成功不等于 Tally 真实端到端成功。必须至少完成一次从新版 Tally 到新 Supabase 的真实测试提交，才确认链路完成。旧项目和生产接收地址在确认切换前保持原状。

当前已验证：AG/DM 国家提取、国家全名生成、电话字符串、地址 JSON 与换行、重复提交去重、错误签名拒绝、无效国家/缺失电话拒绝，以及匿名读写数据库拒绝。自动确认邮件不在本次已完成范围。

签名配置已保存在本机私有文件 `.env.tally-intake-v2`（权限 600，Git 忽略）。Tally agent 如在同一受信任工作区执行，可以读取其中的 `TALLY_SIGNING_SECRET` 用于 Tally Signing secret；不要在聊天、报告或提交中打印它。修改前先协调正式启用时间，不要把文件里当前关闭状态的配置误认为正式字段映射。
