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

export function apiMessage(request: Request, key: string) {
  const messages = getLocale(request) === 'en' ? en : th;
  const value = readPath(messages, `apiErrors.${key}`);
  return typeof value === 'string' ? value : key;
}
