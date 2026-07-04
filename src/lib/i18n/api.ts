import en from '../../../messages/en.json';
import th from '../../../messages/th.json';

type Messages = typeof th;

function getLocale(request: Request) {
  const header = request.headers.get('accept-language') || '';
  return header.toLowerCase().startsWith('en') ? 'en' : 'th';
}

function readPath(messages: Messages, path: string) {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object' && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, messages);
}

export function apiMessage(request: Request, key: string, values?: Record<string, string | number>) {
  const messages = getLocale(request) === 'en' ? en : th;
  const value = readPath(messages, `apiErrors.${key}`);
  const template = typeof value === 'string' ? value : readPath(messages, 'apiErrors.internalError');
  if (typeof template !== 'string') return '';
  if (!values) return template;
  return Object.entries(values).reduce(
    (message, [name, replacement]) => message.replaceAll(`{${name}}`, String(replacement)),
    template,
  );
}
