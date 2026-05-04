import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // V3.3: 允许飞书 / Lark 工作台 iframe 嵌入
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://*.feishu.cn https://*.larksuite.com https://*.feishu-pre.cn",
          },
          // 不要设 X-Frame-Options: DENY/SAMEORIGIN，否则会覆盖上面的 CSP
        ],
      },
    ];
  },
};

export default nextConfig;
