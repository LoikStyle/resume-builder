/**
 * 内存版滑动窗口 rate limit
 * 单进程有效，PM2 cluster 多实例时只能保证"每实例每分钟 N 次"，但 40 人并发场景够用
 */

import type { NextRequest } from 'next/server';

const buckets = new Map<string, number[]>();

/** 返回 true 表示允许；false 表示被限流 */
export function checkRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

/** 提取真实客户端 IP（兼容 nginx X-Forwarded-For / X-Real-IP） */
export function clientIp(req: NextRequest | Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return 'unknown';
}

/** Origin / Referer 校验（防外站直接 POST API） */
export function checkOrigin(req: NextRequest | Request): boolean {
  const origin = req.headers.get('origin') || '';
  const referer = req.headers.get('referer') || '';
  const selfHost =
    req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';

  // 自身 host 来的（无论部署到 Vercel / 腾讯云 / localhost 都自动放过）
  try {
    if (origin && new URL(origin).host === selfHost) return true;
    if (referer && new URL(referer).host === selfHost) return true;
  } catch {}

  // 老线上 + 开发的额外白名单
  const allowed = [
    'https://43.156.46.230:9090',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  if (allowed.some((a) => origin.startsWith(a) || referer.startsWith(a))) return true;

  return false;
}

/** 周期清理 buckets（避免内存泄漏） */
let lastCleanup = Date.now();
export function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60_000) return;
  lastCleanup = now;
  for (const [k, arr] of buckets) {
    const fresh = arr.filter((t) => now - t < 10 * 60_000);
    if (fresh.length === 0) buckets.delete(k);
    else buckets.set(k, fresh);
  }
}
