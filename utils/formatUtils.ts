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

/**
 * Formats a location string, mapping QCG to ABM and stripping group IDs.
 */
export const formatLocationUtil = (type: string, location: string | null | undefined): string => {
    if (!location) return '';
    const cleanLoc = stripGroupId(location);
    const normLoc = cleanLoc.trim().toUpperCase();

    if (normLoc === 'QCG' || normLoc === 'PEL ABM' || normLoc === 'ESCOLA' || normLoc.startsWith('QCG')) {
        const withoutQcg = cleanLoc.replace(/^QCG\s*-?\s*/i, '').trim();
        return withoutQcg ? `ABM - ${withoutQcg}` : 'ABM';
    }
    return cleanLoc;
};
