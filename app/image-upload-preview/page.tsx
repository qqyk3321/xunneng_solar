import { notFound } from "next/navigation";
import { ImageLab } from "./image-lab";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "图片压缩与上传实验室",
  robots: { index: false, follow: false },
};

export default function ImageUploadPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ImageLab />;
}
