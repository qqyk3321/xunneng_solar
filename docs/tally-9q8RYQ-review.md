# 9q8RYQ 表单接入检查

检查日期：2026-09-14。仅访问公开表单和本地页面，没有修改 Tally 或提交真实咨询。

## 已确认

表单 `https://tally.so/r/9q8RYQ` 可访问。installation_country 隐藏字段存在；姓名、邮箱、国际电话、Parish、Town / Village、Street / Area 必填；House / Building、Landmark / Directions 选填。适配现有 V2 接收结构，不需要新设计地址 JSON。

本地 `.env` 原 `NEXT_PUBLIC_TALLY_FORM_ID` 实际为 `Me4YYg`；已新增 `NEXT_PUBLIC_TALLY_INTAKE_FORM_ID=9q8RYQ`，新版 `/consultation` 使用后者。没有修改生产 Vercel 环境变量。

更新 `.env` 后，本地 3003 的再次浏览器检查遇到页面请求超时，因此不能声称新表单的本地嵌入已经浏览器验证通过。之前的无表单状态流程检查已通过；新表单的 AG/DM 检查是直接访问 Tally 完成的。未替用户重启开发服务，请手动重启 3003 后复查。

## Tally agent 尚须完成/确认

1. **国家条件显示目前未生效。** 分别以 `?installation_country=AG`、`?installation_country=DM` 访问并用真实浏览器检查，均未显示 Installation country。两段全名文案和缺失国家提示都被设为隐藏，但当前发布版本只有发电机问题的条件逻辑，没有国家条件逻辑。请配置 AG 显示 Antigua and Barbuda、DM 显示 Dominica，缺失/无效显示返回首页提示，并尽可能阻止继续。
2. 回传九个基础信息字段在 **Webhook `data.fields[].key`** 中的实际值，以及一份虚构提交的原始事件。公开页面中能读到 block/group UUID，但不能未经验证就把它等同于 Webhook key。后端坚持精确映射，不通过英文标题猜测。
3. 确认 Webhook 已配置正确 URL 和 Signing secret；公开表单无法证明后台 Webhook 集成是否已配置。目前新 Supabase 接收仍主动关闭，等待真实映射，不能宣称完整链路已通过。

接收端：`https://thiqsnscgdjwihcfpomw.supabase.co/functions/v1/tally-webhook`。Signing secret 在工作区私有 `.env.tally-intake-v2`，不要在聊天/报告中打印。最终启用必须与网站侧协调，不能直接提交真实客户资料来试错。

详见 [完整交接说明](./tally-intake-v2-handoff.md)。
