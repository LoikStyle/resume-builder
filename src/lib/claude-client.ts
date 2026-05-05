import { spawn } from 'node:child_process';

/** 从模型文本输出中提取 JSON 对象或数组（兼容 markdown 代码块）*/
export function extractJson<T = unknown>(text: string): T {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (codeBlockMatch ? codeBlockMatch[1] : text).trim();

  const arrMatch = candidate.match(/\[[\s\S]*\]/);
  const objMatch = candidate.match(/\{[\s\S]*\}/);

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

/**
 * 调本地 Claude Code CLI。
 * 仅供离线 ETL 脚本（scripts/extract-*.ts）使用，产品 API 走 AIhubmix。
 */
export async function callClaude(
  prompt: string,
  opts: { model?: string; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<string> {
  const model = opts.model ?? 'claude-sonnet-4-6';
  const timeoutMs = opts.timeoutMs ?? 360_000;

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
        const isHookOnlyError = stdout.trim().length > 0 && stderr.includes('hook');
        if (!isHookOnlyError) {
          return reject(new Error(`Claude CLI exit ${code}: ${stderr}`));
        }
      }
      try {
        const wrapper = JSON.parse(stdout);
        const text =
          (typeof wrapper === 'object' && wrapper && 'result' in wrapper
            ? (wrapper as { result?: string }).result
            : undefined) ?? stdout;
        resolve(text);
      } catch {
        resolve(stdout);
      }
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}
