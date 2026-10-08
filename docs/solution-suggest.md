# Solution suggest 子项目

源码核对日期：2026-10-08。本文以当前的 `app/solution-suggest`、`lib/solution-suggest` 为准，记录现状、算法口径和本次检查结果。

## 当前功能与边界

这是从光伏分析模块复制并独立演进的业务子项目，仍在宿主 Next.js 工程中运行，没有自己的 package.json、独立构建服务或部署配置。

- 地址：`/solution-suggest`，本地开发页为 [开发预览](http://localhost:3000/solution-suggest)。
- 解锁后页面显示参数选择、推荐配置、系统技术统计和页面下方的成本核算；布局为单列。
- 参数区只有月用电量和每日用电模型两个输入，保留模型缩略图及详情弹窗。
- 参数标题前的 01 编号、计算说明、固定参数控件、安装条件、气象模型提示均已移除。
- 推荐区保留逆变器、电池、组件数量、全年自主供电、全年夜间电池占比和最差月份夜间电池占比；调整中显示“正在调整方案”，完成后不显示达标徽标或算法说明。
- 逐时能源图、12 个月供电图、主年度汇总、年度侧栏和报告入口均不在当前页面挂载。
- 教程恰好四步：输入用电 → 每日模型 → 推荐配置 → 技术统计。
- 页面不计算或展示电费、节省金额。新增成本核算仅估算所填设备成本与售价，单位美元；报告代码和电费汇总相关旧组件仍保留，但未接入页面。

## 源码分工

| 文件或目录 | 当前职责 | 页面状态 |
| --- | --- | --- |
| app/solution-suggest/page.tsx、access.ts、actions.ts | 服务端解锁、访问模式、Cookie、页面分支 | 活跃 |
| app/solution-suggest/solar-analysis-client.tsx | 两项输入、推荐与统计、模型详情、四步教程 | 活跃 |
| app/solution-suggest/cost-calculator.tsx；lib/solution-suggest/cost.ts | 三档逆变器、每5kWh电池、每块组件单价及售价计算 | 活跃；位于技术统计下方 |
| app/solution-suggest/analysis-dialog.tsx、analysis-tour.tsx、echart.tsx | 弹窗、教程定位、按需加载图表 | 活跃；图表只用于每日模型 |
| lib/solution-suggest/optimizer.ts | 固定条件、配置枚举、排序、高用电量偏好、偶数补足 | 活跃 |
| lib/solution-suggest/simulation.ts | 发电转换、逐时调度、SOC、夜间和充电指标 | 活跃 |
| lib/solution-suggest/models.ts、model-table.ts、model-table-cache.ts、model-table-manifest.json | 模型类型、完整性校验、清单和缓存 | 活跃 |
| app/solution-suggest/visit-tracker.tsx、visit/route.ts；lib/solution-suggest/visit-*.ts | audited 模式的访问记录 | 活跃 |
| app/solution-suggest/analytics.tsx | 已授权页面的 Vercel Analytics | 仅 VERCEL_ENV=production 挂载 |
| app/solution-suggest/installation-picker.tsx、annual-snapshot.tsx；lib/solution-suggest/annual-summary.ts | 旧安装展示与年度账单速览 | 保留，未接入当前页面 |
| app/solution-suggest/report-*.tsx、report-*.ts、report.css；lib/solution-suggest/report.ts、report-text.ts | 报告快照、七页 PDF、预览和客户文字校验 | 保留，无当前页面入口 |
| app/solution-suggest/solar-analysis.css | 当前布局，以及尚未清理的旧区块样式 | 当前页加载 |

业务实现不再导入 app/solar-analysis 或 lib/solar-analysis。仍共享宿主根布局、Next.js/React 依赖、公共组件、来源校验工具以及部分静态资源；保留报告还引用宿主的客服信息。

## 输入与固定条件

| 项目 | 当前约束 |
| --- | --- |
| 月用电量 | 页面默认 300 kWh，限制 0–1,000,000；推荐器接口接收有限、非负数 |
| 每日用电模型 | 白天用电、白天高峰、傍晚高峰、夜间高峰；默认夜间高峰 |
| 数据源与参考地 | PVWatts / NSRDB 典型气象年；安提瓜 |
| 安装 | 屋顶、南向、20° |
| 组件 | 每块 500 W |
| SOC 保留 | 10% |
| 逆变器 | 5、8、10 kW |
| 电池标称容量 | 5、10、15、20 kWh |
| 实际 DC/AC 比 | 0.6–1.2，按实际整数组件数量校验 |
| 组件配对 | ≤12 块允许奇数；>12 块只能输出偶数，向上补足 |

固定条件的权威常量是 optimizer.ts 中的 FIXED_INSTALLATION、PANEL_W、RESERVE_SOC_PERCENT、INVERTERS、BATTERIES、OVERSIZE_RANGE。models.ts 中保留的 DEFAULT_INSTALLATION 仍为旧版 30°，当前页面不使用它；恢复旧控件时不要以它覆盖 20° 固定规则。

四种用电模型均有 24 个非负权重，本次核查各自合计约 100（差异为浮点精度）。模拟时再次归一化，不直接把权重当作 kWh。

## 推荐流程与优先顺序

### 先选择，再配对，再重算

1. baseConfigurations 枚举原始整数组合：5 kW 对应 6–12 块，8 kW 对应 10–19 块，10 kW 对应 12–24 块；结合四种电池共 120 个原始候选。
2. evaluateConfiguration 使用发电模型和逐时调度评价全部原始候选，compareCandidates 按月用电量对应的规则选择一个方案。
3. alignPanelConfiguration 把超过 12 块的奇数向上补为偶数；超配比超上限时，按 5 → 8 → 10 kW 升档，不能增加未允许的逆变器规格。
4. 如果组件或逆变器改变，重新计算发电、供电、SOC、覆盖率、充电匹配和余电比例，返回实际最终配置。

示例：8 kW / 13 块 → 8 kW / 14 块，实际比值 0.875；8 kW / 19 块先补为 20 块，原比值变为 1.25，因此升至 10 kW，最终比值 1.0。

最终合法组合共 80 个：

| 逆变器 | 最终允许的组件数 |
| --- | --- |
| 5 kW | 6、7、8、9、10、11、12 |
| 8 kW | 10、11、12、14、16、18 |
| 10 kW | 12、14、16、18、20、22、24 |

legalConfigurations 与报告校验使用这 80 个最终组合；Recommendation.candidateCount 记录最终合法组合数量，并非最初的模拟次数。业务入口应调用 optimizeSystem；evaluateConfiguration 可用于原始候选或测试配置计算，本身不执行最终配对与完整的设备合法性筛选。

**顺序边界：** 当前是原始候选排序后补足，并不是直接在 80 个最终组合中重新进行全量排序。补足后重算指标与诊断，不重新寻找另一组配置，因此不能声称最终结果在这 80 个组合中达到全局最优。此顺序实现了“13 补成 14、不能退回 12”的规则。补足也可能使余电比例重新超过软目标，不能保留补足前的百分比或达标状态。

### 基础门槛与软目标

- 基础门槛：每个月的夜间电池供电量 / 该月夜间总用电量 ≥50%。夜间为当地 18:00–次日 06:00，只计电池实际放电，不把夜间光伏直供算入电池指标。
- 低需求优选：全年加权夜间电池占比争取 80%；达到后不为更高比例继续奖励扩容。
- 充电匹配：各月每天 06:00–18:00 内的最高 SOC 都达到至少 95%。这是白天曾充到的水平，不要求入夜时仍为 95%，也不是电池利用率。该条件参与排序，并非所有分支都硬性淘汰不满足的配置。
- 组件冗余：全年余电 / 全年光伏发电，严格低于 30% 为软目标。不能用月比例的简单平均代替；都不满足时优先较低比例，低于目标后不继续惩罚合理装机。
- 达标标记 meetsTargets 只表示基础夜间 50% 门槛，**不表示**完全自给、余电低于 30%、95% 充电匹配或高需求目标全部满足。

先比较是否达到基础门槛；其余优先顺序如下，前面的条件优先于后面的条件，并非加权求和或设备成本优化：

| 场景 | 排序优先顺序 |
| --- | --- |
| ≤700 kWh，基础门槛已满足 | 较小电池 → 充电匹配 → 较小逆变器 → 组件冗余 → 夜间占比争取 80% → 全年供电覆盖率 → 较少组件 |
| >700 kWh，基础门槛已满足 | 充电匹配 → 组件冗余 → 接近逆变器容量参考 → 接近最差月份夜间参考 → 接近全年覆盖参考 → 较小电池/逆变器/组件数 |
| 无候选满足基础门槛 | 最差月份夜间电池占比 → 全年夜间电池占比 → 全年覆盖率 → 最差月份覆盖率 → 组件冗余 → 充电匹配 → 较小设备 |

比率比较以 1e-9 作为浮点差异容差；余电“低于 30%”标记使用严格小于。

### 高用电量偏好

HIGH_LOAD_POLICY 集中管理调整起点与参考值：

- ≤700 kWh 不启用新增容量偏好。
- 700–750 kWh 的进度为 (月用电量−700)/50，限制在 0–1。夜间参考从 50% 升至 80%；启用后全年覆盖参考从 75% 升至 90%。
- 750 kWh 起逆变器参考为 8 kW，1200 kWh 起为 10 kW。
- 这些是排序参考，不新增硬件规格，也不保证目标全部达到。达到参考后再选较小设备。
- 输入进度连续不代表设备结果连续：分支切换和离散档位会造成配置跳变。本次夜间高峰样本中，700 kWh 为 10 kWh 电池，701 kWh 已变为 15 kWh；这是当前排序结果，不应描述成“只在恰好 750 才升级”。

## 模拟与指标口径

- 每个月总用电量都等于月输入；每日用电 = 月输入 / 该月天数。全年用电为月输入 ×12。
- 模型为 12 个月 ×24 小时的平均日曲线，按非闰年实际月长重复成 8760 小时；不模拟逐日阴晴或连续阴雨。
- 当前 PVWatts DC 参考曲线按装机缩放，通过通用逆变器曲线转为 AC，并按额定逆变器功率限幅；不是厂家专属设备模型。
- 每小时顺序为光伏直供 → 光伏余电充电 → 电池补缺 → 电网补缺；无电网充电，余电不计售电收入。
- 可用电池容量 = 标称容量 ×90%；充、放电效率各 95%，往返效率约 90.25%；功率上限为标称 kWh ×0.5 kW。
- 电池放电还受逆变器剩余功率约束，光伏直供 + 电池供电 ≤逆变器额定功率；电网补缺不在这项约束内。
- SOC 跨日/月连续，先求年度周期边界再汇总，避免利用初始满电产生免费供电。
- 全年自主供电 = (家庭用电−电网购电)/家庭用电；全年夜间电池占比按实际夜间电量加权；最差月份指标取 12 个月最低值。
- 无用电需求时覆盖率定义为 100%，页面另行显示无需求说明；它不是实际电量收益。
- 电池利用率 = 每日净存入能量 / 可用容量，上限 100%，月内平均、全年按天数加权；不是效率、峰值 SOC 或经济收益。目前页面不展示这个指标，但模拟与保留报告仍使用它。
- 系统技术统计中的日均用电是全年平均(月输入 ×12/365)，不是某个月固定除以 30；实际 DC/AC 比按两位小数展示，模拟保留精度。

这些是有电网补缺的简化估算，不覆盖实际 MPPT/串并联兼容性、瞬时峰值、现场遮挡、停电、衰减或制造商特定限制。

## 数据、缓存与宿主依赖

- 本模块清单：lib/solution-suggest/model-table-manifest.json；当前 schemaVersion=1、modelCount=145。
- 当前资产：/solar-data/models.f962532c32e91a7c.json；版本为完整 SHA-256，以清单为准。页面只选用模型 antigua/south/tilt-20。
- 本次独立核验静态文件的 SHA-256 与清单一致，模型维度、ID 集合和 checksum 校验通过。正常客户端主要校验版本标签、FNV-1a 腐损校验和及结构，不重新计算 SHA-256 内容哈希；FNV 用于腐损检测，不是安全签名。
- 缓存键：solortide:solution-suggest-model-table:v1。授权组件挂载后读取内存或 localStorage；损坏、旧版或无缓存时请求不可变 URL。首次下载超时 20 秒，失败后用户重试会绕过 HTTP 缓存。
- 缓存只保存公开模型，不保存口令、Cookie、月用电输入、客户资料或报告。禁用存储不阻断计算。
- 静态模型资源有意公开；页面密码保护不等于静态文件保密，缓存也不是离线登录。
- Next.js 宿主为 /solar-data 配置长期 immutable 缓存。更新数据需发布新内容哈希 URL，并同步本模块清单；保留旧哈希资产以兼容尚未关闭的旧页面。
- 宿主 solar:prepare / solar:check 仍读写、检查 lib/solar-analysis/model-table-manifest.json，**不自动更新本模块清单**；不能把其成功当成本模块清单已同步。
- 新挂载的输入默认 300 kWh / 夜间高峰；页面不主动持久化输入。BFCache 可保留组件状态，pageshow 处理只调整滚动和焦点，不保证所有浏览器返回都重置参数。

## 成本核算工具

- 位置：系统技术统计下方。成本根据当前最终推荐的逆变器容量、电池标称容量及已补足的实际组件数量联动；单价不参与配置推荐。
- 默认美元单价：5 kW 逆变器 800，8 kW 1100，10 kW 1200；电池每5 kWh 600；组件每块100。
- 价格倍数默认1.0，步长0.1，计算及失焦显示均保留一位小数。单价保留到美分，允许非负数；空值、负值和无效数字不显示误导性合计。
- 逆变器成本仅选取推荐容量对应的一台单价，不把三档单价相加。电池成本 = 标称容量 /5 × 每5 kWh成本，不使用扣除SOC后的可用容量计价。组件成本 = 实际组件数量 × 每块单价。
- 总成本 = 逆变器成本 + 电池成本 + 组件成本；预计售价 = 总成本 × 价格倍数。以整数美分累计，售价四舍五入到美分，防止常见浮点金额漂移。
- 各项小计、总成本、预计售价同时展示美元（US$）、东加勒比元（EC$ / XCD）和人民币（CN¥ / CNY）。单价仍全部输入美元，固定汇率按用户给定值：1 XCD = 0.37 USD，1 CNY = 0.15 USD；折算为美元金额 ÷0.37、美元金额 ÷0.15，不获取实时汇率。
- 折算金额各自四舍五入到两位小数；总成本及售价从对应美元合计折算，不累加已四舍五入的本币小计，因此可有一分钱的显示差异。默认US$2,000对应EC$5,405.41、CN¥13,333.33。空值或无效金额三种币种都显示“—”。
- 默认300 kWh夜间方案（5 kW、5 kWh、6块）：总成本US$2,000.00。750 kWh夜间方案（8 kW、20 kWh、14块）：总成本US$4,900.00；倍数1.5时售价US$7,350.00。
- 调整方案期间显示上一推荐对应的金额并提示正在调整；模型未就绪时合计显示“—”。单价只存于组件内存，不写模型缓存或数据库，新挂载恢复默认值；教程仍为四步。
- 成本单元测试位于 tests/solution-suggest-cost.test.ts；现有浏览器回归覆盖默认值、单价与倍数编辑、配置联动、一位小数归一化、空值处理与手机布局。

## 授权、访问记录与统计

- Cookie 名：solution_suggest_access；Path=/solution-suggest；HttpOnly、SameSite=Strict；NODE_ENV=production 时 Secure；浏览器有效期 12 小时。
- 成功、错误密码跳转都使用 /solution-suggest。本模块令牌摘要使用 sol-tide-solution-suggest:v1 命名空间，与原模块不互通。
- 配置项仍为 SOLAR_ANALYSIS_PASSWORD / SOLAR_PRIVATE_PASSWORD。两项相同输入时 private 校验优先。口令缺失时仍会回退到源码默认值，见检查发现。
- audited 模式在实际页面挂载后尝试记录访问；private 不挂载记录组件，后端对有效 private POST 直接返回 204 且不写表。
- POST /solution-suggest/visit 再次检查 Cookie、同源来源、跨站标记、JSON 类型、512 字节限额及只含一个 v4 UUID 的请求体。
- 浏览器请求超时 6 秒、数据库请求超时 3 秒，无重试；刷新/新进入/BFCache 恢复可产生新访问，参数调整不产生记录。
- 数据表 public.solution_suggest_access_logs；服务端固定 page_path=/solution-suggest，可信 Vercel 环境取有效 IP，UA 最多 1024 字符，环境为 production/preview/development。UUID 用于去重，不是账号身份。
- 服务端密钥配置为 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY；来源配置沿用 SITE_URL / 部署域名，未设置时官网回退为 https://www.solortide.com，开发环境额外允许当前同源地址。
- 缺少密钥、表不存在、超时或写入失败不阻断页面，接口仍可返回 204；不能据此认为云端已入库。
- 迁移为 supabase/migrations/20261008000000_add_solution_suggest_access_logs.sql：开启 RLS，撤销 public/anon/authenticated 权限，仅向 service_role 授予 SELECT/INSERT。此次未执行迁移，也未核验云端表状态。
- Vercel Analytics 只在 VERCEL_ENV=production、已授权分支挂载，audited/private 均可统计；仅保留本页 pageview，清除查询参数、片段与 URL 用户信息。锁定页不挂载该统计组件。
- access.ts 的 PWA Cookie 工具属于复制保留代码，本页面不使用，也没有新增 PWA 入口。

## 保留报告代码的状态

报告源码的方法标识为 4.4；包含七页 A4 英文报告、字体/Logo 加载、图表、可取消生成、PDF.js 预览和 Blob URL 释放。客户文本支持常见拉丁字母，不支持中文和 emoji。

当前页面没有报告按钮、报告弹窗挂载、ReportBasis 构建或电价计算流程。恢复功能时必须接入准确的月度账单和推荐快照，不能只恢复按钮。createSolarReport 会校验模型、固定条件、最终合法组合、月度用电、逆变器输出及容量偏好，随后深拷贝快照；它不重新计算所有优化指标，也不核验外部提供电价是否正确，调用方必须保证数据一致。

未接入的安装选择器、年度速览、报告组件及旧 CSS 仍是维护对象，不属于当前可用页面功能。

## 2026-10-08 源码检查记录

本节记录成本工具新增前的源码检查；该次检查只更新文档，未改业务规则。随后新增成本工具已通过3项金额单元测试、类型和代码检查，以及桌面/手机的单价编辑、推荐联动、倍率精度和空值验证。

| 检查 | 结果 |
| --- | --- |
| TypeScript 全项目类型检查 | 通过 |
| 子项目及其测试 ESLint | 通过 |
| 两个 solution-suggest 单元测试文件 | 18 项通过 |
| 当前页面浏览器回归 | 桌面 1440px、手机 390px；推荐更新、模型详情、四步教程通过 |
| 模型内容核验 | 完整 SHA-256、145 模型、结构和 checksum 通过 |
| 扩展配置检查 | 四模型 ×25 组需求，共100组；0至1,000,000及700/750/1200附近边界通过 |
| 能源与设备约束 | 实际超配比、偶数规则、SOC、合计逆变器输出、月度需求、能量守恒通过；最大浮点比较误差约1.49e-8 |
| 实际新模块访问接口检查 | 8种授权、private不写入、来源、跨站、负载、方法分支通过；保存函数使用测试替身 |
| 图表加载故障注入 | 阻断4个ECharts脚本后复现未处理拒绝；推荐仍能计算，图表加载失败，见待处理项 |

浏览器测试使用 private Cookie 并拦截日志与外部请求，不写云端数据。本次未重新验证干净依赖安装、生产构建、发布环境、真实数据库迁移或当前页面不可达的 PDF UI；保留报告的快照逻辑由单元测试覆盖。宿主锁文件的干净安装问题此前曾出现，未在本次更改或复测。

复核命令（从宿主 xunneng_solar 目录执行）：

~~~powershell
node --conditions=react-server --import tsx --test tests/solution-suggest-optimizer.test.ts tests/solution-suggest.test.ts tests/solution-suggest-cost.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js app/solution-suggest lib/solution-suggest tests/solution-suggest*.test.ts
$env:PLAYWRIGHT_MODULE = '可用的 playwright 模块绝对路径'
node --conditions=react-server --import tsx tests/solution-suggest.browser.cjs
~~~

浏览器用例注入 private Cookie，测试进程与开发服务器须使用相同的 SOLAR_PRIVATE_PASSWORD 配置。若 Next.js 通过 .env / .env.local 读取口令，测试进程也需显式加载对应文件或设置同值环境变量。

扩展检查的临时记录为 .next/solution-source-review.json 与 .next/solution-chart-failure-review.json，属于本地忽略产物，不是长期模型资产。

### 当前夜间高峰样本

| 月用电 kWh | 逆变器 kW | 电池 kWh | 组件块数 | 全年自主供电 | 夜间电池占比 | 最差月夜间电池占比 |
| --- | --- | --- | --- | --- | --- | --- |
| 300 | 5 | 5 | 6 | 76.15% | 66.03% | 62.04% |
| 600 | 5 | 10 | 9 | 75.59% | 65.49% | 61.19% |
| 700 | 5 | 10 | 10 | 69.30% | 55.38% | 51.69% |
| 701 | 5 | 15 | 10 | 87.65% | 85.06% | 79.39% |
| 750 | 8 | 20 | 14 | 99.69% | 100.00% | 100.00% |
| 1200 | 10 | 20 | 20 | 75.87% | 65.74% | 61.53% |
| 3000 | 10 | 20 | 24 | 46.70% | 20.98% | 18.16% |

300 kWh 的6块方案受最少装机限制，余电比例约42.85%；1200 kWh 在19补20后约32.19%。两者均如实标记未达到30%软目标，不能在文档中说所有输出都低于30%。

### 检查发现与待处理项

| 项目 | 源码证据与影响 | 处理状态 |
| --- | --- | --- |
| 登录配置回退与限流缺口 | access.ts 在环境口令缺失时仍使用源码默认值，包括生产环境；actions.ts 无失败计数或限流。Cookie令牌没有服务端过期时间字段，12小时是浏览器Cookie有效期 | 本次未改配置或认证逻辑；正式部署前需明确口令缺失策略、配置独立口令及失败限流 |
| 图表加载异常未捕获 | echart.tsx 的运行时加载链无 catch，拒绝后 runtimePromise 不复位。本次阻断ECharts脚本复现 ChunkLoadError 和未处理拒绝 | 当前正常加载路径通过；异常处理与重试应单独修复 |
| 保留报告说明过时 | report-charts.ts 的逐时柱已移除 export 系列，但 report-pdf.ts 页脚仍说明柱包含送网部分 | 当前页面不可达；恢复报告前应同步文字与实际图表 |
| 旧默认安装常量 | models.ts 的 DEFAULT_INSTALLATION 仍为30°；实际推荐使用 optimizer.ts 的20°固定条件 | 当前结果正确；维护时避免误用旧常量 |
| 复制保留代码 | 旧侧栏、安装选择器、PWA工具、报告链及大量CSS未挂载；报告调用方和电价构建已从当前页面移除 | 已在本文区分活跃与保留文件，未清理源文件 |

算法的离散跳变、软目标无法完全满足、配对后不重新全量排序、月平均日无法模拟连续阴雨属于当前实现边界，不应混同为已验证的真实设备或全天候供电保证。

## 关联文档

以下三篇仍描述原 /solar-analysis 的历史规则；本模块的差异以本文为准：

- [访问日志基线](solar-analysis-access-logs.md)
- [电池模型基线](solar-battery-model.md)
- [模型交付基线](solar-model-delivery.md)
