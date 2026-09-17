# 发电数据源调研与接入记录

核查日期：2026-09-17。目标：安提瓜圣约翰附近、多米尼克罗索附近，四个朝向、0/10/15/20/30°，12 × 24 平均日曲线；优先保存完整逐时天气/发电数据。只离线采集，线上不调用外部气象 API。

## 已接入

| 页面来源 | 数据与时间口径 | 获取与限制 |
| --- | --- | --- |
| PVWatts V8 / NSRDB | 典型气象年，8760 小时 DC/AC；36 套 | 免费 Key，原有档案不动 |
| PVGIS 5.3 / ERA5 | 2022 历史天气，8760 小时系统输出；36 套 | 官方免费 API，无 Key |
| PVGIS 5.2 / NSRDB | 2014 历史天气，8760 小时系统输出；36 套 | 官方免费 API，无 Key；5.3 不提供此 NSRDB 数据库 |
| NASA POWER + pvlib | 2022 辐照、气温、风速 → 通用光伏模型，8760 小时 DC；36 套 | 免费无 Key；NASA 提供天气，不是直接提供发电量 |
| 禾迈原项目 | 12 × 24 平均日 AC，原始装机 7.84 kWp | 保留用户已有文件；地点、朝向和倾角未知 |

共 144 套可选安装模型，加 1 套原禾迈模型。不是 5 个完全独立的气象观测体系：PVWatts 与 PVGIS–NSRDB 共享 NSRDB 数据体系；NASA 自身组合卫星及再分析数据。年份、网格、散热、遮挡和转换模型也不同，不能仅凭结果高低判断谁准确。

官方依据：

- [PVGIS API](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en)、[用户手册](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/pvgis-5-user-manual_en)、[使用条件](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/general-information/usage-conditions-data-protection_en)。
- [NASA POWER 小时 API](https://power.larc.nasa.gov/docs/services/api/temporal/hourly/)、[请求说明](https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/)、[数据 FAQ](https://power.larc.nasa.gov/docs/faqs/data/)。
- [pvlib 辐照转换](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.irradiance.get_total_irradiance.html)、[SAPM 温度](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.temperature.sapm_cell.html)、[ASHRAE IAM](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.iam.ashrae.html)、[PVWatts V5 DC](https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.pvsystem.pvwatts_dc.html)。

## 新档案计算约定

`additional-v1/<source>/manifest.json` 记录完成状态、36 个模型、文件与 SHA-256。每模型包含 `raw.json.gz`（NASA 为每地共享天气）、请求回执 `*.request.json`、`hourly.json.gz`、`curve.json`。请求时间、URL、输入参数、API 元数据、转换说明均保留，不包含凭证。

- 当地时间统一 UTC−4、365 天、8760 个小时段。PVGIS 请求目标年和次年，以覆盖当地 12 月 31 日最后 4 小时；NASA 请求目标年及次年 1 月 1 日。保留完整原响应，不跨时段补洞。原始时间戳按其所在 UTC 小时归组，再转换到本地小时；分钟偏移写入 provenance。
- PVGIS 的 `P` 为系统电功率 W，已经使用其损耗模型。页面仅按装机容量线性缩放并施加用户逆变器 AC 上限，不再扣一次 96% 效率。原始曲线没有人为套用 PVWatts 的 1.2 DC/AC 比；原有削顶若存在则不能反推恢复。
- PVGIS `building` 表示建筑集成、背面无空气流通，并非 PVWatts 固定屋顶的完全等效模型。`free` 为通风安装。保留 API 地形地平线估计，不包含实地屋顶障碍。
- **北向差异**：向 PVGIS 请求 `aspect=-180` 或 `180`，两版本均回显 `-179`，即北偏东 1°；实测 PVcalc 与直接请求 `-179` 总量相同。无法证明仅为格式舍入，因此不声称精确正北。仅接受这一特例，其他方位回显必须精确匹配；页面及 provenance 明确提示。`curve.geometry` 保留用户请求几何，`provenance.api_reported_azimuth_clockwise_from_north` 保存返回几何。0° 朝向无物理意义。
- NASA 小时辐照为 Wh/m²，每小时数值等效平均 W/m²；T2M 为 °C，WS10M 为 m/s。太阳位置使用小时中点，是小时平均天气转发电的近似。使用 pvlib 0.15.2：各向同性散射转倾斜面（反照率 0.2）、直射 ASHRAE IAM b=0.05、散射 IAM=1、SAPM 温度（近贴屋顶/通风支架）、PVWatts V5 DC（温度系数 −0.004/°C）、14% 系统损耗。页面再用原有通用逆变器曲线。**这不是 PVWatts V8，也不是 NASA 发电产品**。
- NASA 网格较粗，岛屿/山区微气候、实际屋顶阴影均无法准确表达。所有来源均为预估，不用于承诺实际发电或未来账单。
- 12 × 24 曲线用真实月份天数聚合，保留原精度。账单仍按 30 天转换为恒定每日用电；全年电池调度先逐时计算再汇总，0.5C 限制不变。

## 筛查但本次未批量接入

| 候选 | 能提供什么 | 本次不接入原因 / 后续条件 |
| --- | --- | --- |
| [Global Solar Atlas](https://www.globalsolaratlas.info/support/faq) | Solargis 长期平均，可设倾角朝向；网页有 12 × 24 PVOUT | 数据作品 CC BY 4.0，但[网站条款](https://www.globalsolaratlas.info/support/terms-of-use)禁止自动抓取；只做少量可行性检查，未批量归档或上线。可由用户人工导出、按要求署名后导入，或取得自动化许可。网页接口不等于获准使用的免费 API |
| [Open-Meteo](https://open-meteo.com/en/terms) | 历史逐时辐照/天气，可自建发电转换 | 免费 API 限非商业；本项目属公司业务用途，内部使用也不能自动视为非商业。需订阅或合规自托管数据 |
| [Renewables.ninja](https://www.renewables.ninja/about) | 指定位置/倾角/朝向的逐时 PV | 数据 CC BY-NC 4.0，商业用途需联系许可；另有注册与调用限额 |
| [Solcast](https://www.solcast.com/terms-of-use) | 历史/预测辐照及光伏 | Hobbyist 针对个人家庭、实时预测，不是本公司历史档案的免费授权；试用时间与共享限制不满足本任务 |
| [Solargis API](https://kb.solargis.com/docs/solargis-api-data-services) | 专业辐照与光伏模型 | 商业订阅，不自动注册/付费 |
| [Copernicus CDS / ERA5](https://cds.climate.copernicus.eu/how-to-api) | 开放再分析，可转换发电 | 需要用户账户、API 凭证并接受数据许可；本次通过 PVGIS 已接入 ERA5，不把同体系当成独立来源凑数 |
| [CAMS Solar Radiation](https://www.copernicus.eu/en/access-data/copernicus-services-catalogue/cams-solar-radiation-time-series) | 太阳辐照时序 | 需进一步核实产品地域覆盖、账户及许可；未伪称已获取加勒比全套数据 |
| [Forecast.Solar](https://forecast.solar/) | 免费短期 PV 预测 | 免费档主要今天/明天，不提供所需全年历史模型；历史功能需付费 |
| [PVGIS 6](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-6/using-pvgis_en) | 新版本气象/功率接口 | 后续迁移候选；接口近期有 breaking changes，尚未完成这两个地点的整套验证；不额外算一个独立天气源 |

本次新增的三种来源无须用户额外申请 Key。若要继续扩充，优先取得 Global Solar Atlas 人工导出的同条件数据，或明确预算及商用许可后选 Solargis / Solcast；不是绕过其收费与访问限制。

## 复采

隔离 Python 环境，安装 `scripts/solar/requirements.txt`（pvlib 固定 0.15.2），然后：

```bash
python scripts/solar/collect-additional.py --source pvgis-era5
python scripts/solar/collect-additional.py --source pvgis-nsrdb
python scripts/solar/collect-additional.py --source nasa-power
python -m unittest discover -s scripts/solar -p 'test_*.py'
node --conditions=react-server --import tsx --test tests/solar-generation.test.ts
```

脚本使用 curl 的系统 TLS 信任，不关闭证书验证；顺序请求、失败退避、成功响应缓存。缓存须与请求 URL 及原始 SHA-256 相符，不能悄悄换参数复用。更改年份/模型须创建新的版本目录，不能覆盖历史原始档案。只有完整批次加入 catalog。线上只携带运行时 gzip 数据和索引；原始天气不发送给浏览器。
