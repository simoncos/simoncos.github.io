/** Match the existing accepted spellings independently of DOM and audio. */
export const normalizeAnswer = (value: string): string => value.normalize('NFKC').toLowerCase().replace(/[\s《》「」『』·.,，。!?！？’'"-]/g, '');
