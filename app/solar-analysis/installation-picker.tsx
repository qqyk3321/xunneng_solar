"use client";

import { useState } from "react";
import AnalysisDialog from "./analysis-dialog";
import { DIRECTION_LABELS, REGION_LABELS, SOURCES, TILTS, installationLabel, isApproximateNorth, type Installation, type Orientation, type Tilt } from "@/lib/solar-analysis/models";

export default function InstallationPicker({ value, onChange }: {
  value: Installation; onChange: (next: Installation) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pv = value.source !== "hoymiles";
  const setTilt = (tilt: Tilt) => onChange({ ...value, tilt, mounting: tilt === 0 ? value.mounting : "roof" });
  return <section id="solar-step-installation" className="compact-installation">
    <div className="compact-installation-head"><h3>安装条件</h3><button type="button" className="source-settings-button" aria-label="修改数据与安装设置" onClick={() => setSettingsOpen(true)} title={installationLabel(value)}><span>{SOURCES[value.source].label} · {pv ? REGION_LABELS[value.region] : "地点未知"} · {pv ? value.mounting === "roof" ? "屋顶" : "通风支架" : "安装未知"}</span><b>修改 ↗</b></button></div>
    {pv ? <>
      <div className="installation-geometry">
        <fieldset className="tilt-picker"><legend>面板倾角 <span className="compact-help" tabIndex={0}>?<span role="tooltip">与水平面的夹角。0° 不区分朝向；通风支架不等于直接贴地。{SOURCES[value.source].mountingNote}</span></span></legend><div className="tilt-options">{TILTS.map(tilt => <button key={tilt} type="button" aria-label={`倾角 ${tilt}°${tilt === 0 ? " 水平放置" : ""}`} aria-pressed={value.tilt === tilt} className={value.tilt === tilt ? "active" : ""} onClick={() => setTilt(tilt)}>
          <svg viewBox="0 0 120 88" aria-hidden="true"><path d="M12 69H110" stroke="#c0d0d0" strokeWidth="2" strokeDasharray="3 3"/><g transform={`rotate(${-tilt} 22 62)`}><rect x="22" y="53" width="76" height="9" rx="2" fill="currentColor"/><path d="M39 54v7m19-7v7m19-7v7" stroke="white" strokeOpacity=".65" strokeWidth="1.5"/></g><path d={`M24 69V62M${22+72*Math.cos(tilt*Math.PI/180)} 69V${62-72*Math.sin(tilt*Math.PI/180)}`} stroke="currentColor" strokeWidth="2"/><circle cx="101" cy="14" r="7" fill="#e8b951"/></svg>
          <strong>{tilt}°</strong><span className="geometry-check" aria-hidden="true">{value.tilt === tilt ? "✓" : ""}</span>
        </button>)}</div></fieldset>
        <fieldset className="direction-picker" disabled={value.tilt === 0}><legend>面板朝向 {value.tilt === 0 && <small>水平时不适用</small>}</legend><div className={`compass-picker ${value.tilt === 0 ? "is-flat" : ""}`}>
          <div className="compass-face" aria-hidden="true"><div className="compass-needle" style={{ transform: `rotate(${{ north: 0, east: 90, south: 180, west: 270 }[value.orientation]}deg)` }}>↑</div>{value.tilt === 0 && <span>水平</span>}</div>
          {(Object.keys(DIRECTION_LABELS) as Orientation[]).map(direction => <button key={direction} type="button" className={`direction-${direction} ${value.tilt !== 0 && value.orientation === direction ? "active" : ""}`} aria-label={`朝向 ${DIRECTION_LABELS[direction]}`} aria-pressed={value.tilt !== 0 && value.orientation === direction} onClick={() => onChange({ ...value, orientation: direction })}>{{ north: "N", east: "E", south: "S", west: "W" }[direction]}</button>)}
        </div></fieldset>
      </div>
      {isApproximateNorth(value) && <p className="installation-note" role="note">PVGIS 北向为近北模型：接口回显北偏东 1°，非精确正北。</p>}
    </> : <div className="installation-legacy-note"><strong>保留原始项目，不推测安装条件</strong><p>禾迈原数据未提供地点、朝向及倾角，因此不显示可调整的方向或角度。该模型仅有月平均日曲线，与 PVWatts 的全年逐时模型计算口径不同。</p></div>}
    <span className="sr-only" data-testid="installation-summary">{installationLabel(value)}</span>
    {settingsOpen && <AnalysisDialog title="数据与安装设置" onClose={() => setSettingsOpen(false)}>
    <div className="installation-selects">
      <label className="v2-field"><span>发电数据源</span><select aria-label="发电数据源" value={value.source} onChange={e => onChange({ ...value, source: e.target.value as Installation["source"] })}>{Object.entries(SOURCES).map(([id, source]) => <option key={id} value={id}>{source.label}</option>)}</select></label>
      <label className="v2-field"><span>参考地区</span><select aria-label="参考地区" disabled={!pv} value={pv ? value.region : "unknown"} onChange={e => onChange({ ...value, region: e.target.value as Installation["region"] })}>{pv ? Object.entries(REGION_LABELS).map(([id, name]) => <option key={id} value={id}>{name}</option>) : <option value="unknown">原项目地点未知</option>}</select></label>
      <label className="v2-field"><span>安装方式</span><select aria-label="安装方式" disabled={!pv} value={pv ? value.mounting : "unknown"} onChange={e => onChange({ ...value, mounting: e.target.value as Installation["mounting"] })}>{pv ? <><option value="roof">固定屋顶</option><option value="open-rack" disabled={value.tilt !== 0}>通风支架（仅已采集 0°）</option></> : <option value="unknown">原项目安装参数未知</option>}</select></label>
    </div>
    <div className="source-context" aria-live="polite"><strong>{SOURCES[value.source].label}</strong><p>{SOURCES[value.source].note}</p><small>不同年份、气象网格和安装散热假设会影响结果；差异不等于准确度排名。</small><a href={SOURCES[value.source].url} target="_blank" rel="noreferrer">数据来源说明 ↗</a></div>
      <p className="installation-note">{SOURCES[value.source].mountingNote}</p>
      <button type="button" className="installation-confirm" onClick={() => setSettingsOpen(false)}>完成设置</button>
    </AnalysisDialog>}
  </section>;
}
