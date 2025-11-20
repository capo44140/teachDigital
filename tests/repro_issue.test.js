
import { describe, it, expect, vi } from 'vitest';

// Mock pg
vi.mock('pg', () => {
    return {
        Pool: class {
            on() { }
            query() { return Promise.resolve({ rows: [] }); }
        }
    };
});

// Import the database module (it will use the mocked pg)
import { sql } from '../backend/lib/database.js';

describe('SQL Query Composition', () => {
    it('should compose nested queries correctly', async () => {
        const profileIdNum = 2;
        const isPublished = true;

        // Base query
        let query = sql`
      SELECT 
        id, title
      FROM lessons
      WHERE 1=1
    `;

        // Add profile condition
        query = sql`${query} AND profile_id = ${profileIdNum}`;

        // Add published condition
        query = sql`${query} AND is_published = ${isPublished}`;

        // Add order
        query = sql`${query} ORDER BY created_at DESC LIMIT 100`;

        // Check properties of the resulting promise-like object
        expect(query).toHaveProperty('text');
        expect(query).toHaveProperty('params');

        console.log('Generated SQL:', query.text);
        console.log('Generated Params:', query.params);

        // Expected SQL structure (whitespace might vary)
        expect(query.text).toContain('SELECT');
        expect(query.text).toContain('FROM lessons');
        expect(query.text).toContain('WHERE 1=1');
        expect(query.text).toContain('AND profile_id = $1');
        expect(query.text).toContain('AND is_published = $2');
        expect(query.text).toContain('ORDER BY created_at DESC LIMIT 100');

        expect(query.params).toEqual([2, true]);
    });
});
