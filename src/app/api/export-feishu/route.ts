import { NextRequest, NextResponse } from 'next/server';
import { pushToBitable, toBitableFields } from '@/lib/feishu-client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scenario = String(body.scenario ?? '').trim();
    const intakeAnswers = body.intakeAnswers as Parameters<typeof toBitableFields>[0]['intakeAnswers'];
    const basicInfo = (body.basicInfo as Record<string, string> | undefined) ?? {};

    if (!intakeAnswers || !basicInfo.name) {
      return NextResponse.json(
        { error: '缺少 intakeAnswers 或 basicInfo.name' },
        { status: 400 }
      );
    }

    const fields = toBitableFields({ basicInfo, intakeAnswers, scenario });

    // 尝试推飞书多维表格
    try {
      const result = await pushToBitable(fields);
      return NextResponse.json({
        mode: result.mode,
        record_id: result.record_id,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      // 凭证缺失：fallback 下载 JSON
      if (
        msg === 'FEISHU_NOT_CONFIGURED' ||
        msg === 'FEISHU_DIRECT_NOT_CONFIGURED' ||
        msg === 'FEISHU_RELAY_NOT_CONFIGURED'
      ) {
        const json = JSON.stringify(
          {
            _hint: '飞书凭证未配置，本次以 JSON 形式返回。手动导入飞书多维表格或 scp 到腾讯云脚本即可。',
            _fields_for_bitable: fields,
            _raw: { scenario, intakeAnswers, basicInfo },
            _generated_at: new Date().toISOString(),
          },
          null,
          2
        );
        return new NextResponse(json, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="student-${
              encodeURIComponent(basicInfo.name) || 'untitled'
            }.json"`,
          },
        });
      }

      // 其他真实错误：返回 500
      console.error('[export-feishu] error:', msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '导出失败' },
      { status: 500 }
    );
  }
}
