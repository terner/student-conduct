import { getLocale } from 'next-intl/server';
import en from '../../../messages/en.json';
import th from '../../../messages/th.json';

type Messages = typeof th;

function readPath(messages: Messages, path: string) {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object' && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, messages);
}

function formatMessage(template: string, values?: Record<string, string | number>) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export async function serverMessage(path: string, values?: Record<string, string | number>) {
  const locale = await getLocale();
  const messages = locale === 'en' ? en : th;
  const value = readPath(messages, path);
  return typeof value === 'string' ? formatMessage(value, values) : path;
}

export async function serverApiMessage(key: string, values?: Record<string, string | number>) {
  const locale = await getLocale();
  const messages = locale === 'en' ? en : th;
  const value = readPath(messages, `apiErrors.${key}`);
  const fallback = readPath(messages, 'apiErrors.internalError');
  const template = typeof value === 'string' ? value : fallback;
  return typeof template === 'string' ? formatMessage(template, values) : '';
}
