"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function EChart({
  option,
  className = "solar-chart",
}: {
  option: echarts.EChartsOption | Record<string, unknown>;
  className?: string;
}) {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!element.current) return;
    const chart = echarts.init(element.current);
    chart.setOption(option as echarts.EChartsOption);
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [option]);

  return <div ref={element} className={className} />;
}
