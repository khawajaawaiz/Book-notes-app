import pg from "pg";

const connectionString = "postgresql://postgres.tvwwsnwfsybzeeulcxjb:HWW7s348UpZRZGKY@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres";

const db = new pg.Client({
    connectionString: connectionString,
});

async function setupUsers() {
    try {
        await db.connect();
        console.log("✅ Connected to Supabase");

        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            );
        `);
        console.log("✅ Table 'users' created or already exists");

    } catch (err) {
        console.error("❌ Setup failed:", err);
    } finally {
        db.end();
    }
}

setupUsers();
