import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // Read locale from cookie set by middleware
  let locale = 'th';
  try {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
    if (localeCookie && ['th', 'en'].includes(localeCookie)) {
      locale = localeCookie;
    }
  } catch {
    // Fallback to default locale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
