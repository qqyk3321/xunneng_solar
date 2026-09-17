import { parseModelTable, type ModelTable, type TableManifest } from "./model-table";

export const MODEL_TABLE_STORAGE_KEY = "solortide:solar-model-table:v1";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Instantiate without side effects. Call load only from the password-authorized page. */
export function createModelTableLoader(manifest: TableManifest, options: {
  getStorage?: () => StorageLike;
  fetcher?: typeof fetch;
  timeoutMs?: number;
} = {}) {
  let memory: ModelTable | null = null;
  let pending: Promise<ModelTable> | null = null;
  let bypassHttpCache = false;
  return function load(): Promise<ModelTable> {
    if (memory) return Promise.resolve(memory);
    if (pending) return pending;
    pending = (async () => {
      let storage: StorageLike | undefined;
      try { storage = (options.getStorage ?? (() => window.localStorage))(); } catch { /* Storage may be disabled. */ }
      try {
        const saved = storage?.getItem(MODEL_TABLE_STORAGE_KEY);
        if (saved) {
          if (saved.length > 1_100_000) throw new Error("Oversized cache");
          const cached = JSON.parse(saved);
          if (cached.version === manifest.version && typeof cached.text === "string") {
            memory = parseModelTable(cached.text, manifest);
            return memory;
          }
          storage?.removeItem(MODEL_TABLE_STORAGE_KEY);
        }
      } catch { try { storage?.removeItem(MODEL_TABLE_STORAGE_KEY); } catch { /* Best effort only. */ } }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
      try {
        const response = await (options.fetcher ?? fetch)(manifest.url, {
          signal: controller.signal, credentials: "omit", cache: bypassHttpCache ? "reload" : "force-cache",
        });
        if (!response.ok) throw new Error("模型表下载失败，请检查网络后重试。");
        const text = await response.text();
        const table = parseModelTable(text, manifest);
        memory = table;
        try { storage?.setItem(MODEL_TABLE_STORAGE_KEY, JSON.stringify({ version: manifest.version, text })); } catch { /* Quota or privacy settings must not block analysis. */ }
        return table;
      } catch (error) {
        bypassHttpCache = true;
        if (controller.signal.aborted) throw new Error("模型表下载超时，请重试。");
        throw error;
      } finally { clearTimeout(timeout); }
    })().finally(() => { pending = null; });
    return pending;
  };
}
