"use client";

import { DIRECTION_LABELS, REGION_LABELS, SOURCES, TILTS, installationLabel, isApproximateNorth, type Installation, type Orientation, type Tilt } from "@/lib/solar-analysis/models";

export default function InstallationPicker({ value, onChange, confirmed, onConfirm, guided }: {
  value: Installation; onChange: (next: Installation) => void; confirmed: boolean; onConfirm: () => void; guided: boolean;
}) {
  const pv = value.source !== "hoymiles";
  const setTilt = (tilt: Tilt) => onChange({ ...value, tilt, mounting: tilt === 0 ? value.mounting : "roof" });
  return <section id="solar-step-installation" className={`v2-card installation-card ${guided ? "tour-target" : ""}`}>
    <div className="section-title"><div><span>01</span><div><h2>数据源与安装条件</h2><p className="installation-subtitle">先确认面板怎么安装，再开始系统分析</p></div></div><span className="installation-badge">{confirmed ? "修改后自动重新计算" : "从这里开始"}</span></div>
    <div className="installation-selects">
      <label className="v2-field"><span>发电数据源</span><select aria-label="发电数据源" value={value.source} onChange={e => onChange({ ...value, source: e.target.value as Installation["source"] })}>{Object.entries(SOURCES).map(([id, source]) => <option key={id} value={id}>{source.label}</option>)}</select></label>
      <label className="v2-field"><span>参考地区</span><select aria-label="参考地区" disabled={!pv} value={pv ? value.region : "unknown"} onChange={e => onChange({ ...value, region: e.target.value as Installation["region"] })}>{pv ? Object.entries(REGION_LABELS).map(([id, name]) => <option key={id} value={id}>{name}</option>) : <option value="unknown">原项目地点未知</option>}</select></label>
      <label className="v2-field"><span>安装方式</span><select aria-label="安装方式" disabled={!pv} value={pv ? value.mounting : "unknown"} onChange={e => onChange({ ...value, mounting: e.target.value as Installation["mounting"] })}>{pv ? <><option value="roof">固定屋顶</option><option value="open-rack" disabled={value.tilt !== 0}>通风支架（仅已采集 0°）</option></> : <option value="unknown">原项目安装参数未知</option>}</select></label>
    </div>
    <div className="source-context" aria-live="polite"><strong>{SOURCES[value.source].label}</strong><p>{SOURCES[value.source].note}</p><small>不同年份、气象网格和安装散热假设会影响结果；差异不等于准确度排名。</small><a href={SOURCES[value.source].url} target="_blank" rel="noreferrer">数据来源说明 ↗</a></div>
    {pv ? <>
      {guided && <div className="tour-action-hint"><b>↓</b><span>点击倾角示意图，再点击方位按钮选择面板朝向；0° 无需选择朝向</span></div>}
      <div className={`installation-geometry ${guided ? "tour-control-focus" : ""}`}>
        <fieldset className="tilt-picker"><legend>面板倾角 <small>与水平面的夹角</small></legend><div className="tilt-options">{TILTS.map(tilt => <button key={tilt} type="button" aria-label={`倾角 ${tilt}°${tilt === 0 ? " 水平放置" : ""}`} aria-pressed={value.tilt === tilt} className={value.tilt === tilt ? "active" : ""} onClick={() => setTilt(tilt)}>
          <svg viewBox="0 0 120 88" aria-hidden="true"><path d="M12 69H110" stroke="#c0d0d0" strokeWidth="2" strokeDasharray="3 3"/><g transform={`rotate(${-tilt} 22 62)`}><rect x="22" y="53" width="76" height="9" rx="2" fill="currentColor"/><path d="M39 54v7m19-7v7m19-7v7" stroke="white" strokeOpacity=".65" strokeWidth="1.5"/></g><path d={`M24 69V62M${22+72*Math.cos(tilt*Math.PI/180)} 69V${62-72*Math.sin(tilt*Math.PI/180)}`} stroke="currentColor" strokeWidth="2"/><circle cx="101" cy="14" r="7" fill="#e8b951"/></svg>
          <strong>{tilt}°</strong><small>{tilt === 0 ? "水平放置" : tilt === 15 ? "常用倾角" : "倾斜安装"}</small><span className="geometry-check" aria-hidden="true">{value.tilt === tilt ? "✓" : ""}</span>
        </button>)}</div></fieldset>
        <fieldset className="direction-picker" disabled={value.tilt === 0}><legend>面板朝向 <small>{value.tilt === 0 ? "水平放置时不适用" : "面板正面朝向 · 正北为基准"}</small></legend><div className={`compass-picker ${value.tilt === 0 ? "is-flat" : ""}`}>
          <div className="compass-face" aria-hidden="true"><div className="compass-needle" style={{ transform: `rotate(${{ north: 0, east: 90, south: 180, west: 270 }[value.orientation]}deg)` }}>↑</div><span>{value.tilt === 0 ? "水平" : "面板正面"}</span></div>
          {(Object.keys(DIRECTION_LABELS) as Orientation[]).map(direction => <button key={direction} type="button" className={`direction-${direction} ${value.tilt !== 0 && value.orientation === direction ? "active" : ""}`} aria-label={`朝向 ${DIRECTION_LABELS[direction]}`} aria-pressed={value.tilt !== 0 && value.orientation === direction} onClick={() => onChange({ ...value, orientation: direction })}>{DIRECTION_LABELS[direction]} <small>{{ north: "N", east: "E", south: "S", west: "W" }[direction]}</small></button>)}
        </div></fieldset>
      </div>
      <p className="installation-note">{value.tilt === 0 ? "0° 不区分东南西北。通风支架指背面有空气流通，不能当作直接贴地；积灰、积水和现场遮挡未单独建模。" : SOURCES[value.source].mountingNote}</p>
      {isApproximateNorth(value) && <p className="installation-note" role="note">此 PVGIS 接口对正北请求回显为北偏东 1°，本模型按近北处理，不代表精确正北；请求值和返回值均已归档。</p>}
    </> : <div className="installation-legacy-note"><strong>保留原始项目，不推测安装条件</strong><p>禾迈原数据未提供地点、朝向及倾角，因此不显示可调整的方向或角度。该模型仅有月平均日曲线，与 PVWatts 的全年逐时模型计算口径不同。</p></div>}
    <div className="installation-footer"><div><small>当前安装条件</small><strong data-testid="installation-summary">{installationLabel(value)}</strong></div>{!confirmed && <button type="button" className="installation-confirm" onClick={onConfirm}>确认安装条件，开始分析 <span aria-hidden="true">→</span></button>}</div>
  </section>;
}
