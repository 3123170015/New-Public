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
