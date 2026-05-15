export function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function normalizePhone(value = '') {
  return String(value).replace(/[^\d]/g, '');
}

export function normalizeDocKey(docKey = '') {
  return normalizeText(docKey).replace(/\s+/g, '_');
}
