import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilterableGames(db: Database): Promise<{ categoryIds: number[]; publisherIds: number[] }> {
    const insertedCategories = await db
        .insert(categories)
        .values([
            { name: 'Strategy', description: 'strategy games' },
            { name: 'Puzzle', description: 'puzzle games' },
        ])
        .returning({ id: categories.id });
    const insertedPublishers = await db
        .insert(publishers)
        .values([
            { name: 'CodeForge Studios', description: 'publisher one' },
            { name: 'DevMasters Inc.', description: 'publisher two' },
        ])
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Alpha Strategy',
            description: 'strategy one',
            starRating: 4.2,
            categoryId: insertedCategories[0].id,
            publisherId: insertedPublishers[0].id,
        },
        {
            title: 'Beta Puzzle',
            description: 'puzzle one',
            starRating: 4.1,
            categoryId: insertedCategories[1].id,
            publisherId: insertedPublishers[0].id,
        },
        {
            title: 'Gamma Strategy',
            description: 'strategy two',
            starRating: 4.0,
            categoryId: insertedCategories[0].id,
            publisherId: insertedPublishers[1].id,
        },
    ]);

    return {
        categoryIds: insertedCategories.map((category) => category.id),
        publisherIds: insertedPublishers.map((publisher) => publisher.id),
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by multiple categories', async () => {
        const { categoryIds } = await seedFilterableGames(db);
        const filtered = await getAllGames(db, { categoryIds });

        expect(filtered.map((game) => game.title)).toEqual([
            'Alpha Strategy',
            'Beta Puzzle',
            'Gamma Strategy',
        ]);
    });

    it('filters games by multiple publishers', async () => {
        const { publisherIds } = await seedFilterableGames(db);
        const filtered = await getAllGames(db, { publisherIds: [publisherIds[1]] });

        expect(filtered.map((game) => game.title)).toEqual(['Gamma Strategy']);
    });

    it('combines category and publisher filters', async () => {
        const { categoryIds, publisherIds } = await seedFilterableGames(db);
        const filtered = await getAllGames(db, {
            categoryIds: [categoryIds[0]],
            publisherIds: [publisherIds[0]],
        });

        expect(filtered.map((game) => game.title)).toEqual(['Alpha Strategy']);
    });

    it('returns no games when filters do not match', async () => {
        const { categoryIds } = await seedFilterableGames(db);
        const filtered = await getAllGames(db, { categoryIds: [categoryIds[0] + 1000] });

        expect(filtered).toEqual([]);
    });
});
