import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cross-origin isolation lets ONNX Runtime use every CPU core instead of one.
  // "credentialless" keeps cross-origin loads (model files, sample images) working without CORP headers.
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
