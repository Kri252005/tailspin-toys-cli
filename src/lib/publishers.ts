/**
 * Provides data-access helpers for retrieving publisher records from the database.
 */
import { asc } from 'drizzle-orm';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';
import type { Database } from './db';

/**
 * Retrieves all publishers ordered alphabetically by name.
 *
 * @param db - The database connection used to query publisher records.
 * @returns A list of publishers containing each publisher's id and name.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));

    return rows.map((row): Publisher => ({ id: row.id, name: row.name }));
}
