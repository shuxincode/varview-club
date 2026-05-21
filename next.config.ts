import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/predict/enrich",
        destination: `${process.env.PREDICTION_ENGINE_URL || "http://localhost:8000"}/predict`,
      },
    ];
  },
};

export default nextConfig;
