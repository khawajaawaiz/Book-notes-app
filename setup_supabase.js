import pg from "pg";

const connectionString = "postgresql://postgres.tvwwsnwfsybzeeulcxjb:HWW7s348UpZRZGKY@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres";

const db = new pg.Client({
    connectionString: connectionString,
});

async function setup() {
    try {
        await db.connect();
        console.log("✅ Connected to Supabase");

        // Drop table if exists to start fresh (optional, but good for setup script)
        await db.query("DROP TABLE IF EXISTS books;");

        // Create Table with DECIMAL rating
        await db.query(`
      CREATE TABLE books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        rating DECIMAL(3, 1) CHECK (rating BETWEEN 0 AND 5),
        notes TEXT,
        read_date DATE,
        isbn TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log("✅ Table 'books' created");

        // Insert Data
        const insertQuery = `
      INSERT INTO books (title, author, rating, notes, read_date, isbn)
      VALUES
      ('Atomic Habits', 'James Clear', 5, 'Great book on building habits', '2024-01-15', '0735211299'),
      ('Deep Work', 'Cal Newport', 4, 'Focus and productivity', '2023-11-10', '1455586692'),
      ('The Alchemist', 'Paulo Coelho', 3, 'Inspirational story', '2022-06-05', '0061122416'),
      ('Sapiens', 'Yuval Noah Harari', 5, 'Human history and evolution explained clearly', '2023-08-20', '0062316095'),
      ('Thinking, Fast and Slow', 'Daniel Kahneman', 4, 'Psychology of thinking and decision making', '2023-05-10', '0374533555'),
      ('Rich Dad Poor Dad', 'Robert T. Kiyosaki', 4, 'Financial mindset and asset building', '2022-12-01', '1612680194'),
      ('Start With Why', 'Simon Sinek', 4, 'Leadership and purpose-driven thinking', '2023-03-15', '1591846447'),
      ('The Power of Habit', 'Charles Duhigg', 5, 'How habits are formed and changed', '2024-01-05', '081298160X'),
      ('The 4-Hour Workweek', 'Timothy Ferriss', 3, 'Lifestyle design and productivity concepts', '2022-09-18', '0307465357'),
      ('Man’s Search for Meaning', 'Viktor E. Frankl', 5, 'Meaning of life through suffering', '2023-02-12', '0807014273'),
      ('Zero to One', 'Peter Thiel', 4, 'Startup innovation and monopoly thinking', '2023-06-01', '0804139296');
    `;

        await db.query(insertQuery);
        console.log("✅ Initial data inserted");

    } catch (err) {
        console.error("❌ Setup failed:", err);
    } finally {
        db.end();
    }
}

setup();
