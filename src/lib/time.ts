const CHINA_TIME_ZONE = 'Asia/Shanghai';

function normalizeServerTimestamp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    return trimmed.replace(' ', 'T') + 'Z';
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}Z`;
  }

  return trimmed;
}

export function parseServerTime(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = normalizeServerTimestamp(value);
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getServerTimeMs(value?: string | null) {
  const date = parseServerTime(value);
  return date ? date.getTime() : null;
}

export function formatServerDateTime(value?: string | null) {
  const date = parseServerTime(value);
  if (!date) {
    return value || '--';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: CHINA_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}
