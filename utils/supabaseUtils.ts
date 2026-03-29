import { supabase } from '../supabase';

/**
 * Fetches all rows from a Supabase table bypassing the default 1000 limit 
 * by using pagination.
 *
 * @param tableName - The name of the table to query.
 * @param selectQuery - The select query string (default: '*')
 * @param filters - An optional callback to apply filters/ordering to the query.
 * @returns All rows from the table matching the filters.
 */
export async function fetchAllRows(
    tableName: string, 
    selectQuery = '*', 
    filters?: (query: any) => any
): Promise<any[]> {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        let query = supabase.from(tableName).select(selectQuery).range(from, from + step - 1);
        
        if (filters) {
            query = filters(query);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < step) {
                hasMore = false;
            } else {
                from += step;
            }
        } else {
            hasMore = false;
        }
    }

    return allData;
}
