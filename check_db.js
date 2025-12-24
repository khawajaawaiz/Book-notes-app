import pg from "pg";

const connectionString = "postgresql://postgres.tvwwsnwfsybzeeulcxjb:HWW7s348UpZRZGKY@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres";

const pool = new pg.Pool({
    connectionString: connectionString,
});

async function checkTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log("Tables in public schema:", res.rows.map(r => r.table_name));

        const favCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'favorites'");
        console.log("Favorites columns:", favCols.rows);
    } catch (err) {
        console.error("Error checking tables:", err);
    } finally {
        await pool.end();
    }
}

checkTables();
