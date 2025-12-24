import pg from "pg";

const connectionString = "postgresql://postgres.tvwwsnwfsybzeeulcxjb:HWW7s348UpZRZGKY@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres";

const db = new pg.Client({
    connectionString: connectionString,
});

async function createFavoritesTable() {
    try {
        await db.connect();
        console.log("✅ Connected to Supabase");

        await db.query(`
            CREATE TABLE IF NOT EXISTS favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
                UNIQUE(user_id, book_id)
            );
        `);
        console.log("✅ Table 'favorites' created or already exists");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await db.end();
    }
}

createFavoritesTable();
