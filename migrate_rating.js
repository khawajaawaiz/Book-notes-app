import pg from "pg";

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Book Notes Tracker",
    password: "SQL@2025",
    port: 5432,
});

db.connect();

async function migrate() {
    try {
        await db.query("ALTER TABLE books ALTER COLUMN rating TYPE DECIMAL(3, 1);");
        console.log("✅ Migration successful: rating column type changed to DECIMAL(3, 1)");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        db.end();
    }
}

migrate();
