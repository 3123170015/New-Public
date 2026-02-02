import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["live/ingest"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request) {
  const auth = await requireExternalUser(req, ["live/ingest"]);
  if (auth instanceof Response) return auth;

  return Response.json(
    {
      ok: true,
      ingest: {
        nginxRtmp: {
          ingestUrl: "rtmp://stream.example.com/live",
          streamKey: "demo_stream_key",
          hlsOutput: "https://r2.example.com/live/demo.m3u8",
        },
        cloudflareStream: {
          ingestUrl: "rtmps://live.cloudflarestream.com/live",
          streamKey: "cf_demo_key",
          playbackUrl: "https://customer.cloudflarestream.com/demo/manifest/video.m3u8",
        },
      },
    },
    { headers: auth.cors },
  );
}
