import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkAndFixSchema() {
    try {
        const res = await pool.query("SELECT * FROM users LIMIT 1");
        const user = res.rows[0];
        console.log("Current user columns:", Object.keys(user || {}));

        if (user && !('is_admin' in user)) {
            console.log("is_admin column missing, adding it...");
            await pool.query("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE");
            console.log("Column added.");

            // Make one user an admin if possible
            await pool.query("UPDATE users SET is_admin = TRUE WHERE email = 'awaiskhawaja52@gmail.com'");
            console.log("Set awaiskhawaja52@gmail.com as admin.");
        } else if (!user) {
            console.log("No users in DB to check columns against from rows, checking information_schema...");
            const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
            const colNames = cols.rows.map(r => r.column_name);
            console.log("Columns:", colNames);
            if (!colNames.includes('is_admin')) {
                await pool.query("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE");
                console.log("Column added.");
            }
        }
    } catch (err) {
        console.error("Error checking schema:", err);
    } finally {
        await pool.end();
    }
}

checkAndFixSchema();
