import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { uploadThemeAsset } from "@/lib/themeAssets";

async function readFileText(file: File) {
  const buf = await file.arrayBuffer();
  return Buffer.from(buf).toString("utf8");
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdmin(session)) return new Response("FORBIDDEN", { status: 403 });

  const form = await req.formData();
  const name = String(form.get("name") ?? "Theme preset").slice(0, 120);
  const description = String(form.get("description") ?? "").slice(0, 500) || null;
  let themeJsonRaw = "";
  const themeJsonFile = form.get("themeJson");
  if (themeJsonFile && typeof themeJsonFile !== "string") {
    themeJsonRaw = (await readFileText(themeJsonFile)).slice(0, 20000);
  } else {
    themeJsonRaw = String(form.get("themeJson") ?? "").slice(0, 20000);
  }
  const themeJson = safeJson(themeJsonRaw);
  if (!themeJson || typeof themeJson !== "object" || Array.isArray(themeJson)) {
    return new Response("Invalid themeJson", { status: 400 });
  }

  const assets: Record<string, string> = {};
  const logo = form.get("logoFile");
  if (logo && typeof logo !== "string") {
    const uploaded = await uploadThemeAsset(logo, "theme-logo");
    assets.logoUrl = uploaded.url;
  }
  const background = form.get("backgroundFile");
  if (background && typeof background !== "string") {
    const uploaded = await uploadThemeAsset(background, "theme-bg");
    assets.backgroundUrl = uploaded.url;
  }

  const preset = await prisma.themePreset.create({
    data: {
      name,
      description,
      themeJson: themeJson as any,
      assetsJson: Object.keys(assets).length ? (assets as any) : null,
    },
  });

  return Response.json({ id: preset.id });
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session)) return new Response("FORBIDDEN", { status: 403 });
  const presets = await prisma.themePreset.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return Response.json(presets);
}
