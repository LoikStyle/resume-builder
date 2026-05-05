/**
 * 基本信息字段校验（前后端复用）
 * 必填字段：name / school / major
 * 选填字段：phone / email / graduation（填了要符合格式）
 */

export type BasicInfo = {
  name?: string;
  school?: string;
  major?: string;
  phone?: string;
  email?: string;
  graduation?: string;
};

export type FieldKey = 'name' | 'school' | 'major' | 'phone' | 'email' | 'graduation';

const RULES: Record<FieldKey, { test: (v: string) => boolean; error: string }> = {
  name: {
    test: (v) => /^[一-龥A-Za-z·.\s]{2,10}$/.test(v.trim()),
    error: '姓名 2-10 个字（仅中英文）',
  },
  school: {
    test: (v) => {
      const t = v.trim();
      return t.length >= 2 && t.length <= 30;
    },
    error: '毕业院校 2-30 字',
  },
  major: {
    test: (v) => {
      const t = v.trim();
      return t.length >= 2 && t.length <= 30;
    },
    error: '专业 2-30 字',
  },
  phone: {
    test: (v) => /^1[3-9]\d{9}$/.test(v.trim()),
    error: '手机号必填且必须是 11 位（1 开头）',
  },
  email: {
    test: (v) => v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    error: '邮箱格式不对',
  },
  graduation: {
    test: (v) => v.trim() === '' || /^\d{4}[.\-/]\d{1,2}$/.test(v.trim()),
    error: '毕业时间格式：2025.06 或 2025-06 或 2025/06',
  },
};

export function validateField(key: FieldKey, value: string): string | null {
  return RULES[key].test(value) ? null : RULES[key].error;
}

/** 校验整个 basicInfo，返回所有错误（按字段顺序） */
export function validateBasicInfo(b: BasicInfo): { field: FieldKey; error: string }[] {
  const order: FieldKey[] = ['name', 'school', 'major', 'phone', 'email', 'graduation'];
  const errors: { field: FieldKey; error: string }[] = [];
  for (const key of order) {
    const v = (b[key] ?? '').toString();
    if (key === 'name' || key === 'school' || key === 'major' || key === 'phone') {
      if (!v.trim()) {
        errors.push({ field: key, error: `${LABEL[key]}必填` });
        continue;
      }
    }
    const err = validateField(key, v);
    if (err) errors.push({ field: key, error: err });
  }
  return errors;
}

const LABEL: Record<FieldKey, string> = {
  name: '姓名',
  school: '毕业院校',
  major: '专业',
  phone: '手机号',
  email: '邮箱',
  graduation: '毕业时间',
};

/** 长度硬上限（防 1MB 大字段攻击）—— 服务端兜底 */
export const FIELD_MAX_LENGTH: Record<FieldKey, number> = {
  name: 30,
  school: 50,
  major: 50,
  phone: 20,
  email: 100,
  graduation: 20,
};

export function enforceLength(b: BasicInfo): string | null {
  for (const [key, max] of Object.entries(FIELD_MAX_LENGTH)) {
    const v = (b[key as FieldKey] ?? '').toString();
    if (v.length > max) return `${LABEL[key as FieldKey]}超长（最多 ${max} 字）`;
  }
  return null;
}
