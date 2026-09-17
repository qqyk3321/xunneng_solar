export function annualSnapshot(baselineKwh: number, baselineCost: number, result: {
  grid: number; cost: number; generation: number; export: number;
} | null) {
  return {
    baselineKwh, baselineCost,
    grid: result?.grid ?? null,
    cost: result?.cost ?? null,
    savedKwh: result ? baselineKwh - result.grid : null,
    savedCost: result ? baselineCost - result.cost : null,
    savingPercent: result ? (baselineCost > 0 ? (baselineCost - result.cost) / baselineCost * 100 : 0) : null,
    generation: result?.generation ?? null,
    export: result?.export ?? null,
    exportPercent: result ? (result.generation > 0 ? result.export / result.generation * 100 : 0) : null,
  };
}
export type AnnualSnapshot = ReturnType<typeof annualSnapshot>;
