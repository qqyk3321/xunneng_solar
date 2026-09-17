# 光伏发电模型档案

本目录为**离线采集档案**，不在 `public/` 内。`solar-analysis` 页面在密码验证通过、确认安装条件后，仅从受保护的 `/solar-analysis/model` 接口获取所选模型，不直接调用外部气象服务。API Key 不写入文件、不进入前端、不提交 Git。

当前有 **144 套安装模型 + 1 套原禾迈模型**：PVWatts、PVGIS–ERA5、PVGIS–NSRDB、NASA POWER + pvlib，各 36 套。新增数据的年份、转换方法、使用条件、北向参数差异和未接入候选详见 [SOURCE_RESEARCH.md](SOURCE_RESEARCH.md)。以下 PVWatts 专属假设不应套用到其他来源。

## 来源分离

- 原禾迈模型：仓库根目录 `hoymiles_gooo_Glorida_generation_curve.json`，7.84 kWp。保留原样。原文件未提供坐标、倾角、朝向，全部标记为未知，不能通过项目名称推断地点。
- `catalog.json` 为跨来源/批次索引；仅 `status: complete` 的批次可供使用。`pvwatts-v8/<采集时间>/manifest.json` 为 PVWatts 单批次索引，首批 32 套、水平补充 4 套。`additional-v1/<source>/manifest.json` 为三个新增来源索引，各 36 套。
- 当前只采集发电模型；不修改每日用电模型。

## 参考地点与系统假设

| 地区 | 参考地点 | 纬度 | 经度 |
| --- | --- | --- | --- |
| 安提瓜 | 圣约翰附近 | 17.1274 | -61.8468 |
| 多米尼克（Dominica，非多米尼加） | 罗索附近 | 15.301 | -61.388 |

这不是精确屋顶坐标，也不是全国统一气候。岛上地形、海拔、遮挡和局地云量会造成差异。模型同时保存请求坐标、实际气象网格坐标及距离；超过 10 km 或时区异常时脚本停止，不自动接受远处站点。

- 朝向：正北 0°、正东 90°、正南 180°、正西 270°，从北顺时针；不可直接混用 PVGIS 的方位角约定。
- 倾角：相对水平面 **0°、10°、15°、20°、30°**。0° 为水平面，方位角不适用，保存为 `null`，无需复制四份朝向数据；API 必填 `azimuth=0` 仅是占位参数，不表示朝北。
- 每套基准为 **1 kWp 直流装机**，标准组件。原 32 套为固定屋顶安装；0° 分别采集固定屋顶 `array_type=1` 与固定通风支架 `array_type=0`。通风支架并非直接贴地，贴地散热、积灰积水及实际遮挡未专门建模。倾斜通风支架尚未采集，页面不允许选择该组合。
- 系统损耗 14%，DC/AC 比 1.2（约 0.8333 kW AC 逆变器），逆变器额定效率 96%。这些是建模假设，不是实测设备参数。
- NSRDB 气象数据，逐时输出；其他显式参数见每份 `request.parameters`。未额外指定双面组件、月度积灰或反照率覆盖值，使用该版本模型默认行为；没有输入实际屋顶的遮挡、线缆或设备详细设计。
- API 版本、SSC 版本、实际天气数据版本、警告均随文件保存。

## 文件结构和含义

每个批次：

```text
manifest.json
antigua/east/tilt-10/raw.sanitized.json
antigua/east/tilt-10/curve.json
antigua/horizontal/tilt-0/roof/curve.json
antigua/horizontal/tilt-0/open-rack/curve.json
...其余地区、朝向、倾角
```

- `raw.sanitized.json`：完整 API 数值响应及元数据，只删除认证字段/脱敏密钥。包含全年 8,760 点 AC、DC、辐照、温度、风速等。原始 `ac`/`dc` 单位是 **W**，不是 kWh。
- `curve.json`：12 个月，每个月 24 个时段的平均日发电量；结构沿用旧模型关键字段 `months[].average_day_hourly_generation_wh`，其单位为 **Wh/小时段**。同时保留 DC 平均日曲线、月总量、年总量、全部系统参数和时区。
- `manifest.json`：完整性状态、路径、SHA-256、年发电量、校验结果，以及旧禾迈文件的原始哈希和未知几何参数。

采用当地标准时间 **UTC−4**，无夏令时。第 0 项对应 1 月 1 日 00:00–01:00，第 23 项对应 23:00–24:00；无需再把数组从 UTC 向前挪 4 小时。典型气象年 TMY 是代表性天气序列，**不是某个真实年份的连续实测记录**，即使天气源名称含有年份也不可当作该年实测。按 365 天、2 月 28 天处理。

对某月某小时：

```text
平均小时段电量 Wh = Σ(该月每天该小时的 AC 功率 W × 1 h) / 该月天数
月电量 kWh = Σ(该月全部小时功率 W × 1 h) / 1000
年电量 kWh = Σ(月电量)
```

不把月份统一改为 30 天：用户账单的“按 30 天换算每日用电”属于用电输入逻辑，与发电气象数据的真实月份天数分开。文件保留原始精度，前端展示才取两位小数。允许 API 小数舍入差异（月 0.01 kWh、年 0.02 kWh 以内），不强行缩放小时曲线凑 API 总量。

## 页面计算与模型边界

1. 页面按实际 DC 装机容量缩放**逐时 DC 数据**，再按用户的逆变器 AC 额定功率限幅。采用归档 SSC 280 数据匹配的简化 Sandia 参考曲线：效率参数 96%、启动功率 `Pso = 0.004931 × Paco`、`Pdco = Paco / 0.96`、`AC = clamp(Paco × (DC − Pso) / (Pdco − Pso), 0, Paco)`；已对全部 36 套基准 AC 数据校验，逐点误差小于 0.002 W。此为通用参考逆变器，不是用户所选品牌设备的精确曲线，也不模拟 DC 耦合储能回收削顶电量。依据：[SSC PVWatts V8 inverter calculations](https://github.com/NatLabRockies/ssc/blob/develop/ssc/cmod_pvwattsv8.cpp)。
2. PVWatts 的电池调度在完整 8,760 小时序列上进行后汇总；图表展示每月 24 小时的**平均流向**，因此同一个小时段的月平均图可能同时出现充电与放电，表示不同日期的情况，不是同一真实时刻同时充放电。电池跨日、跨月连续，使用周期稳定的年初电量，0 点不强制清零；充放电各按 95% 效率、0.5 kW/kWh 功率上限。以光伏直供、余电充电、剩余免费送网为顺序，不从电网充电。
3. 这些是历史或典型气象条件下的估算，不是未来天气预报或发电保证。发电档案本身不含储能，储能调度、功率与效率由页面业务计算器负责。
4. 当前五档倾角（含水平）、四个正方向只是离散模型。其他角度不能伪装成已采集值；可另行请求 API，或明确标记插值及误差。
5. 禾迈仅有月平均日 AC 曲线，页面重复该月平均日进行全年模拟并限制 AC 上限，无法还原实际逐日天气和原逆变器已削掉的电量。原始归档不修改。不同来源不能当作同条件下的精确对照。

## 重新采集与验证

Node.js 24，无额外依赖。建议交互式隐藏输入；不用命令行参数传密钥，不使用 `NEXT_PUBLIC_` 变量：

```bash
(stty -echo; trap 'stty echo' EXIT; node scripts/solar/collect-pvwatts.mjs --key-stdin)
node --test scripts/solar/pvwatts-model.test.mjs
node --conditions=react-server --import tsx --test tests/solar-generation.test.ts
```

仅追加水平数据可在采集命令末尾加 `--horizontal-only`。默认采集全部 36 套；补充模式采集 4 套，不重复下载原 32 套。新批次完成并校验后再手动更新 `catalog.json`，防止未完成批次进入页面。

也可通过已有安全环境变量 `PVWATTS_API_KEY` 提供。每次采集创建新时间戳目录，不覆盖历史批次。串行请求，45 秒超时，网络/429/部分 5xx 最多 3 次尝试；401/403 不重试。失败批次保持 `collecting`，不能作为完整档案使用。脚本检查 API 参数回显、8760 点、数值合法性、12×24 聚合、时区、站点距离、月年能量一致性和凭证脱敏。

官方依据：[PVWatts V8 API 与单位](https://developer.nlr.gov/docs/solar/pvwatts/v8/)、[时间定义](https://samrepo.nlr.gov/help/weather_time_convention.html)、[API Key 请求头](https://developer.nlr.gov/docs/api-key/)。
