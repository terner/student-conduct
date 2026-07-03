export function compareNullableText(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? '').localeCompare(b ?? '', 'th', { numeric: true, sensitivity: 'base' });
}

export function compareNullableNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  direction: 'asc' | 'desc',
) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

export function textOrEmpty(value: string | null | undefined) {
  return value ?? '';
}

export function joinNonEmpty(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).join(', ');
}

export function scoreText(score: number | null | undefined, cappedLabel: string) {
  if (score == null) return '';
  return score > 100 ? cappedLabel : String(score);
}

export function statusLabel<TValue extends string>(value: TValue, labels: Partial<Record<TValue, string>>) {
  return labels[value] ?? '';
}
