export interface GuardianNameParts {
  guardian_prefix?: string;
  guardian_first_name?: string;
  guardian_last_name?: string;
  guardian_full_name?: string;
}

const KNOWN_GUARDIAN_PREFIXES = ['นาย', 'นางสาว', 'นาง', 'คุณ'];

function trimOrEmpty(value?: string | null) {
  return (value || '').trim();
}

export function buildGuardianFullName(parts: GuardianNameParts) {
  const prefix = trimOrEmpty(parts.guardian_prefix);
  const firstName = trimOrEmpty(parts.guardian_first_name);
  const lastName = trimOrEmpty(parts.guardian_last_name);

  if (prefix || firstName || lastName) {
    const firstSegment = `${prefix}${firstName}`.trim();
    return [firstSegment, lastName].filter(Boolean).join(' ').trim();
  }

  return trimOrEmpty(parts.guardian_full_name);
}

export function parseGuardianFullName(fullName?: string | null): Required<Omit<GuardianNameParts, 'guardian_full_name'>> {
  const raw = trimOrEmpty(fullName);
  if (!raw) {
    return {
      guardian_prefix: '',
      guardian_first_name: '',
      guardian_last_name: '',
    };
  }

  const prefix = KNOWN_GUARDIAN_PREFIXES.find((candidate) => raw.startsWith(candidate)) || '';
  const withoutPrefix = prefix ? raw.slice(prefix.length).trim() : raw;

  if (!withoutPrefix) {
    return {
      guardian_prefix: prefix,
      guardian_first_name: '',
      guardian_last_name: '',
    };
  }

  const [firstName = '', ...rest] = withoutPrefix.split(/\s+/);
  return {
    guardian_prefix: prefix,
    guardian_first_name: firstName.trim(),
    guardian_last_name: rest.join(' ').trim(),
  };
}
