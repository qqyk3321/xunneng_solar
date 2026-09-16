"use client";

import type { ECharts, EChartsOption } from "echarts";
import { useEffect, useRef } from "react";

let runtimePromise: Promise<typeof import("echarts/core")> | undefined;

function loadEChartsRuntime() {
  if (!runtimePromise) {
    runtimePromise = Promise.all([
      import("echarts/core"),
      import("echarts/charts"),
      import("echarts/components"),
      import("echarts/renderers"),
    ]).then(([core, charts, components, renderers]) => {
      core.use([
        charts.BarChart,
        charts.LineChart,
        components.GridComponent,
        components.LegendComponent,
        components.TooltipComponent,
        renderers.CanvasRenderer,
      ]);
      return core;
    });
  }
  return runtimePromise;
}

export default function EChart({
  option,
  className = "solar-chart",
}: {
  option: EChartsOption | Record<string, unknown>;
  className?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);
  const latestOption = useRef(option);
  latestOption.current = option;

  useEffect(() => {
    let cancelled = false;
    const resize = () => chart.current?.resize();

    void loadEChartsRuntime().then((runtime) => {
      if (cancelled || !element.current) return;
      chart.current = runtime.init(element.current);
      chart.current.setOption(latestOption.current as EChartsOption);
      window.addEventListener("resize", resize);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option as EChartsOption, { notMerge: true });
  }, [option]);

  return <div ref={element} className={className} />;
}
