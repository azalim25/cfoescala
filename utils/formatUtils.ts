/**
 * Removes internal group tags like [GRP_1773103733460] from a text string.
 */
export const stripGroupId = (text?: string): string => {
    if (!text) return '';
    return text.replace(/\[GRP_\d+\]/g, '').trim();
};

/**
 * Extracts a group tag like [GRP_1773103733460] from a text string.
 */
export const getGroupId = (text?: string): string | null => {
    if (!text) return null;
    const match = text.match(/\[GRP_\d+\]/);
    return match ? match[0] : null;
};
