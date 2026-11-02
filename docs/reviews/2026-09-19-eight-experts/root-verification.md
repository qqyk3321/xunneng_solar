# 主评审复核记录

日期：2026-09-19。本文件补充独立专家记录，不替代或回改他们的评分。

## 边界

评审针对公开获客网站与首页简易计算器，不是对受密码保护的 `/solar-analysis` 工程分析器、数据库权限、实际安装质量或真实成交报价的审计。本次没有提交咨询、访问客户记录、修改业务代码或部署。浏览器诊断拦截已识别的分析请求，避免产生不必要遥测；不能保证第三方没有记录正常网页访问。

## 直接复核

1. Playwright 访问 `/antigua`、`/dominica`、`/dominica/faq`、`/antigua/privacy` 均返回 HTTP 200；390px 视口未发现这些页面横向溢出。这不是全设备无障碍或性能认证。
2. 展开 Dominica FAQ 后仍显示 Antigua/APUA 的计算器说明，与 Dominica 首页 DOMLEC 情景矛盾。FAQ 内返回计算器的根路径链接不保留 Dominica 地区上下文。当前 `/` 是 Caribbean 总入口，不能根据早期历史把它再描述为 Antigua 首页。
3. 只读执行本地 `calculate(1200, "bill", config)`，Antigua 得到月省960、年省11520、目标回本3.505762711864407年、投资40386.38644067797；Dominica 得到相同节省、目标回本3.447478260869565年、投资39714.94956521739。两者均满足 `price === annualSaving * years`。这些数字与线上显示的取整值一致。只能说明公开简易模型的计算关系，不能外推最终销售报价虚假或高级分析器采用相同算法。
4. 本地 `components/antigua-solar-calculator.tsx` 与线上展开问号均已有历史费率、80%假设和非报价说明；Dominica 还提醒未包含2026-10-01新结构。问题是结果区显著性与模型性质，不是完全未披露。
5. 隐私页声称 Cookie 选择不保存；但线上根页打开 Cookie preferences 并点 Reject optional 后，浏览器 `localStorage` 实际保存 `sol-tide:cookie-preferences:v1`，值为 `{"version":1,"analytics":false,"marketing":false}`。提示框也明确说选择会保存、但不改变网站服务。源码 `components/home-privacy-notice.tsx` 与此一致。因此应写成“UI偏好已持久化，尚未接入服务控制，政策关于不保存的描述过时”，不能断言按钮完全没有任何效果。此测试只改变隔离浏览器的本地偏好，没有修改网站业务数据。
6. 公开100+安装数量旁确有示意/待确认说明；源码也明确是占位值。应撤下或核验，不应据此推断真实安装数量为零。

## 官方资料与适用限制

- [IRC 新电价结构公告](https://www.ircdominica.org/news/new-electricity-tariff-takes-effect-october-1-what-customers-should-know/)：本次直接读取，计划2026-10-01生效。截至评审日尚未生效。公告不足以完整重建新费率，不编造具体新单价。
- [IRC DREG 许可提醒](https://www.ircdominica.org/news/call-for-mandatory-licensing-of-dreg-facilities/)：说明直接或间接接入国家电网的DREG许可要求，以及20kW及以上离网设施的情形。支持网站交付流程应解释当地许可及责任；不证明本公司任何项目未取得许可。
- [APUA 公开流程](https://www.apua.ag/programs/green-antigua/renewable-energy-antigua/)：曾经Node fetch成功读取申请、批准、检查、获准运行及不同容量结算安排；后续重取超时。页面列出容量相关的net-billing / buy-all-sell-all区别，但阈值用语、计量对象、储能/不送电系统及最新个案适用性仍需APUA确认。不能直接把首页“6kW逆变器”当作已确定的监管分类或断言其不能自发自用。

## 汇总原则

保留八位专家原分和不同判断；均分只用于排序讨论，不是统计意义上的行业认证。任何“未公开”的资质、售后、价格或隐私资料，均不得擅自填成虚构事实。文案可直接修订；真实身份、履约范围、工程证据和报价依据需要业务方确认。
