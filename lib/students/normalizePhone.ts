export interface PhoneNormalizationResult {
  valid: boolean;
  normalized: string | null;
  countryCode?: string;
  original: string;
  errorCode?: 'INVALID_PHONE' | 'EMPTY_INPUT';
}

export function normalizeSaudiPhone(input: unknown): PhoneNormalizationResult {
  if (!input) {
    return { valid: false, normalized: null, original: String(input), errorCode: 'EMPTY_INPUT' };
  }

  // 1. Convert to string and remove all spaces, dashes, and plus signs
  let raw = String(input).replace(/[\s\-\+]/g, '');

  // 2. Handle country code removal (966)
  if (raw.startsWith('966')) {
    raw = raw.substring(3);
  } else if (raw.startsWith('00966')) {
    raw = raw.substring(5);
  }

  // 3. Ensure it starts with '05'
  if (raw.startsWith('5')) {
    raw = '0' + raw;
  }

  // 4. Validate exact format: must be exactly 10 digits starting with 05
  const isValid = /^05[0-9]{8}$/.test(raw);

  if (!isValid) {
    return {
      valid: false,
      normalized: null,
      original: String(input),
      errorCode: 'INVALID_PHONE'
    };
  }

  return {
    valid: true,
    normalized: raw,
    countryCode: "966",
    original: String(input)
  };
}