import OpenAI from 'openai';

export type CallOptions = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export class AIhubmixError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AIhubmixError';
    this.status = status;
  }
}

export async function callOpenAI(opts: CallOptions): Promise<string> {
  const baseURL = (opts.baseUrl || 'https://aihubmix.com/v1').replace(/\/$/, '');
  const model = opts.model || 'gpt-4o-mini';

  if (!opts.apiKey) {
    throw new AIhubmixError('API key 未设置——请在右上角【设置】里填 AIhubmix key', 401);
  }

  const client = new OpenAI({ apiKey: opts.apiKey, baseURL });

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        messages: [
          ...(opts.systemPrompt ? [{ role: 'system' as const, content: opts.systemPrompt }] : []),
          { role: 'user' as const, content: opts.prompt },
        ],
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 4000,
      },
      { signal: opts.signal }
    );

    const text = completion.choices?.[0]?.message?.content;
    if (!text) throw new AIhubmixError('AIhubmix 返回空响应', 500);
    return text;
  } catch (e) {
    if (e instanceof AIhubmixError) throw e;
    const status = (e as { status?: number })?.status ?? 500;
    const msg = e instanceof Error ? e.message : String(e);
    if (status === 401) {
      throw new AIhubmixError('API key 无效或已过期，请在【设置】里检查', 401);
    }
    if (status === 429) {
      throw new AIhubmixError('AIhubmix 限流或配额耗尽，请稍后再试', 429);
    }
    throw new AIhubmixError(msg, status);
  }
}
