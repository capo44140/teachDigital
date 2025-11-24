const { default: sql, pool } = require('./lib/database.js');

async function listTables() {
    try {
        console.log('Describing quiz_results:');
        const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'quiz_results'
    `);
        columns.rows.forEach(c => console.log(`- ${c.column_name} (${c.data_type})`));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

listTables();
