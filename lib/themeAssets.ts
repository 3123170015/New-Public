import { env } from "@/lib/env";
import { uploadBufferToR2 } from "@/lib/r2io";

type UploadResult = {
  key: string;
  url: string;
};

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
}

export async function uploadThemeAsset(file: File, prefix = "theme"): Promise<UploadResult> {
  const bucketBase = String(env.R2_PUBLIC_BASE_URL || "").trim();
  if (!bucketBase) {
    throw new Error("R2_PUBLIC_BASE_URL is required to upload theme assets.");
  }

  const ext = safeName(file.name || "").split(".").pop();
  const filename = ext ? `${prefix}.${ext}` : prefix;
  const key = `theme/${Date.now()}-${Math.random().toString(16).slice(2)}-${filename}`;
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  await uploadBufferToR2(key, buf, file.type || "application/octet-stream");
  const url = `${bucketBase.replace(/\/+$/, "")}/${key}`;
  return { key, url };
}
