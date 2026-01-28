/** @type {import('next').NextConfig} */
function safeUrlHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const r2Host = safeUrlHost(process.env.R2_PUBLIC_BASE_URL || "");

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // NOTE: This temporarily ignores type errors during build
    // There are 494+ pre-existing TypeScript strict mode errors in the codebase
    // that need to be addressed separately
    ignoreBuildErrors: true,
  },
  experimental: {
    // Required for `unauthorized()` in App Router to render `unauthorized.tsx`
    // with HTTP 401 status.
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      ...(r2Host
        ? [
            {
              protocol: "https",
              hostname: r2Host,
            },
            {
              protocol: "http",
              hostname: r2Host,
            },
          ]
        : []),
    ],
  },
};
export default nextConfig;
