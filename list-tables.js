const { default: sql, pool } = require('./backend/lib/database.js');

async function listTables() {
    try {
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables:', result.rows.map(r => r.table_name));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

listTables();
