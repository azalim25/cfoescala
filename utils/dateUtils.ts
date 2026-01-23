/**
 * Safely parses an ISO date string (YYYY-MM-DD) into a Date object
 * in the local timezone, avoiding issues with UTC shifting.
 */
export const safeParseISO = (isoString: string | null | undefined): Date => {
    if (!isoString || typeof isoString !== 'string') return new Date();

    // Handle full ISO strings or just dates
    const datePart = isoString.split('T')[0];
    const parts = datePart.split('-');

    if (parts.length !== 3) return new Date();

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    // Check if date is valid
    if (isNaN(date.getTime())) return new Date();

    return date;
};

/**
 * Formats a date string or object to DD/MM/YYYY
 */
export const formatShortDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? safeParseISO(date) : date;
    return d.toLocaleDateString('pt-BR');
};

/**
 * Gets the localized weekday name
 */
export const getWeekday = (date: string | Date, type: 'long' | 'short' = 'long'): string => {
    const d = typeof date === 'string' ? safeParseISO(date) : date;
    return d.toLocaleDateString('pt-BR', { weekday: type });
};
