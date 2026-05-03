import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 训练师简历生成器',
  description: '面向 AI 训练师 / 评测方向求职学生的简历定制平台',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
