import { spawn } from 'node:child_process';

/**
 * POC 阶段：调本地 Claude Code CLI
 * 复用用户已登录的 Claude Code 订阅，不需要 API key
 *
 * v2 上云时改成 @anthropic-ai/sdk 即可，外部签名不变
 */
export async function callClaude(
  prompt: string,
  opts: { model?: string; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<string> {
  const model = opts.model ?? 'claude-sonnet-4-6';
  const timeoutMs = opts.timeoutMs ?? 360_000;  // 6 分钟，给 Sonnet 长 prompt 留余量

  return new Promise((resolve, reject) => {
    const proc = spawn(
      'claude',
      ['--print', '--model', model, '--output-format', 'json'],
      { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env } }
    );

    let stdout = '';
    let stderr = '';
    let aborted = false;
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Claude CLI 超时 (${timeoutMs}ms)`));
    }, timeoutMs);

    // 客户端断连时杀子进程，避免孤儿进程累积争抢资源
    const onAbort = () => {
      aborted = true;
      clearTimeout(timer);
      proc.kill('SIGTERM');
      reject(new Error('Claude CLI 已被客户端 abort'));
    };
    if (opts.signal) {
      if (opts.signal.aborted) {
        onAbort();
        return;
      }
      opts.signal.addEventListener('abort', onAbort, { once: true });
    }

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
      if (aborted) return;
      if (code !== 0) {
        return reject(new Error(`Claude CLI exit ${code}: ${stderr}`));
      }
      try {
        const wrapper = JSON.parse(stdout);
        const text =
          (typeof wrapper === 'object' && wrapper && 'result' in wrapper
            ? (wrapper as { result?: string }).result
            : undefined) ?? stdout;
        resolve(text);
      } catch {
        // 不是 JSON 包装，直接返回原始 stdout
        resolve(stdout);
      }
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

/** 从 Claude 输出中提取 JSON 对象或数组（兼容 markdown 代码块）*/
export function extractJson<T = unknown>(text: string): T {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (codeBlockMatch ? codeBlockMatch[1] : text).trim();

  // 优先匹配数组
  const arrMatch = candidate.match(/\[[\s\S]*\]/);
  const objMatch = candidate.match(/\{[\s\S]*\}/);

  // 选距离更靠前的（如果两者都有，用更外层那个）
  let pick: string | null = null;
  if (arrMatch && objMatch) {
    pick =
      candidate.indexOf(arrMatch[0]) <= candidate.indexOf(objMatch[0])
        ? arrMatch[0]
        : objMatch[0];
  } else if (arrMatch) {
    pick = arrMatch[0];
  } else if (objMatch) {
    pick = objMatch[0];
  }

  if (!pick) throw new Error('未找到 JSON');
  return JSON.parse(pick) as T;
}
