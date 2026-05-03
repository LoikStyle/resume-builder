import { NextRequest, NextResponse } from 'next/server';
import { ResumeSchema, type TemplateKind } from '@/lib/schema/resume';
import { renderResumeHtml } from '@/lib/render-html';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ResumeSchema.safeParse(body.resume);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'resume schema 校验失败', issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const template = (body.template as TemplateKind) || 'dense';
    const resume = parsed.data;

    // 纯字符串拼 HTML，避开 Next 16 server-component 对 react-dom/server 的禁止
    const fullHtml = renderResumeHtml(resume, template);

    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' });
      // 给 webfont 一点点时间渲染（中文字体已经是系统字体，不需要等）
      await new Promise((r) => setTimeout(r, 200));
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '14mm', bottom: '12mm', left: '14mm' },
      });
      const u8 = new Uint8Array(pdf);
      return new NextResponse(u8, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(
            resume.basic.name || 'resume'
          )}_${template}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.error('[export-pdf] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '导出失败' },
      { status: 500 }
    );
  }
}
