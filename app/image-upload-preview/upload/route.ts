import { createImageUploadHandler } from "@/lib/image-lab/upload-handler";
import { storeLabImage } from "@/lib/image-lab/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createImageUploadHandler({
  enabled: process.env.NODE_ENV === "development",
  origin: process.env.AUTH_PREVIEW_ORIGIN ?? "http://192.168.1.176:3003",
  store: storeLabImage,
});
