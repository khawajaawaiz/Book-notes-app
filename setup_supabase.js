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
      ('Zero to One', 'Peter Thiel', 4, 'Startup innovation and monopoly thinking', '2023-06-01', '0804139296'),
      ('The Lean Startup', 'Eric Ries', 4, 'Innovation and entrepreneurship', '2023-04-20', '0307887898'),
      ('Good to Great', 'Jim Collins', 4, 'Business excellence and growth', '2022-08-15', '0066620996'),
      ('The Innovators Dilemma', 'Clayton Christensen', 4, 'Disruption and innovation', '2023-07-10', '0062060244'),
      ('Influence', 'Robert Cialdini', 5, 'Psychology of persuasion', '2023-09-05', '006124189X'),
      ('Freakonomics', 'Steven Levitt', 4, 'Economics and incentives', '2022-10-12', '0061234001'),
      ('The Selfish Gene', 'Richard Dawkins', 4, 'Evolution and genetics', '2023-05-20', '019286193X'),
      ('Grit', 'Angela Duckworth', 4, 'Perseverance and success', '2024-02-10', '1501111108'),
      ('Educated', 'Tara Westover', 5, 'Personal memoir and education', '2023-11-15', '0399590610'),
      ('When Breath Becomes Air', 'Paul Kalanithi', 5, 'Life and mortality reflection', '2023-03-20', '0812988329'),
      ('The Book of Mormon', 'Joseph Smith', 3, 'Religious text and history', '2022-05-10', '0843123362'),
      ('A Brief History of Time', 'Stephen Hawking', 4, 'Physics and cosmology', '2023-08-05', '0553380168'),
      ('The God Delusion', 'Richard Dawkins', 3, 'Religion and atheism', '2022-12-15', '061592515X'),
      ('Thus Spoke Zarathustra', 'Friedrich Nietzsche', 3, 'Philosophy and nihilism', '2023-06-25', '0140441182'),
      ('Critique of Pure Reason', 'Immanuel Kant', 2, 'Dense philosophical work', '2023-01-30', '0486656950'),
      ('Being and Nothingness', 'Jean-Paul Sartre', 3, 'Existential philosophy', '2023-07-15', '0415278739'),
      ('The Brothers Karamazov', 'Fyodor Dostoevsky', 5, 'Russian literature classic', '2024-01-10', '0374175728'),
      ('Crime and Punishment', 'Fyodor Dostoevsky', 5, 'Psychological thriller', '2023-10-20', '0199232776'),
      ('War and Peace', 'Leo Tolstoy', 4, 'Epic historical fiction', '2022-11-25', '0199232567'),
      ('Anna Karenina', 'Leo Tolstoy', 4, 'Love and society in Russia', '2023-02-18', '0143039989'),
      ('Pride and Prejudice', 'Jane Austen', 5, 'Romance and social commentary', '2023-04-05', '0141439513'),
      ('The Great Gatsby', 'F. Scott Fitzgerald', 5, 'American literature classic', '2024-03-15', '0743273567'),
      ('To Kill a Mockingbird', 'Harper Lee', 5, 'Moral growth and justice', '2023-09-10', '0061120081'),
      ('1984', 'George Orwell', 5, 'Dystopian classic', '2023-12-01', '0451524934'),
      ('Brave New World', 'Aldous Huxley', 4, 'Dystopian society', '2022-09-20', '0060085061'),
      ('Fahrenheit 451', 'Ray Bradbury', 4, 'Censorship and control', '2023-08-12', '1451673264'),
      ('The Catcher in the Rye', 'J.D. Salinger', 3, 'Coming of age', '2022-07-08', '0316769174'),
      ('The Hobbit', 'J.R.R. Tolkien', 5, 'Fantasy adventure', '2023-11-20', '0547928211'),
      ('The Lord of the Rings', 'J.R.R. Tolkien', 5, 'Epic fantasy trilogy', '2024-02-25', '0544003411'),
      ('Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', 5, 'Magic and wonder', '2023-10-10', '0590353403'),
      ('The Hunger Games', 'Suzanne Collins', 4, 'Dystopian young adult', '2022-08-22', '0439023483'),
      ('Dune', 'Frank Herbert', 5, 'Science fiction epic', '2023-07-05', '0441013597'),
      ('Foundation', 'Isaac Asimov', 4, 'Science fiction and future', '2023-05-15', '0553293354'),
      ('Ender''s Game', 'Orson Scott Card', 5, 'Military science fiction', '2024-01-20', '0812550706'),
      ('Neuromancer', 'William Gibson', 4, 'Cyberpunk classic', '2023-09-25', '0441569595'),
      ('The Matrix', 'Various', 4, 'Philosophy and reality', '2023-06-30', '0880647632'),
      ('Inception', 'Christopher Nolan', 5, 'Dreams and consciousness', '2024-03-10', '1609143159'),
      ('Interstellar', 'Various', 5, 'Space and time', '2023-11-05', '0451465946'),
      ('The Martian', 'Andy Weir', 5, 'Survival and science', '2023-08-18', '0553418025'),
      ('Ready Player One', 'Ernest Cline', 4, 'Virtual reality and gaming', '2022-10-30', '0552770256'),
      ('The Expanse Series', 'James S.A. Corey', 4, 'Space opera', '2023-04-12', '0316217638'),
      ('Neuroscience of Consciousness', 'Various', 3, 'Brain and mind', '2023-02-20', '0815341849'),
      ('The Elegant Universe', 'Brian Greene', 4, 'String theory and physics', '2023-06-08', '039333810X'),
      ('Cosmos', 'Carl Sagan', 5, 'Universe and exploration', '2024-02-15', '0394535581'),
      ('A Brief History of Everything', 'Ken Wilber', 3, 'Integral philosophy', '2023-03-25', '1570627959'),
      ('The Origin of Species', 'Charles Darwin', 4, 'Evolution and natural selection', '2023-07-20', '0451529065'),
      ('Gravity', 'Neil deGrasse Tyson', 4, 'Physics explained', '2023-09-12', '0393634802'),
      ('The Code Breaker', 'Jennifer Doudna', 5, 'CRISPR and genetic engineering', '2024-01-05', '0593230256'),
      ('Outliers', 'Malcolm Gladwell', 4, 'Success and opportunity', '2023-05-18', '0316017922'),
      ('Blink', 'Malcolm Gladwell', 4, 'Intuition and snap decisions', '2022-12-10', '0316204374'),
      ('David and Goliath', 'Malcolm Gladwell', 4, 'Underdogs and advantages', '2023-08-22', '0316204374'),
      ('The Tipping Point', 'Malcolm Gladwell', 4, 'Social epidemiology', '2023-04-15', '0316346624'),
      ('Quiet', 'Susan Cain', 4, 'Introversion and personality', '2023-10-05', '0307352153'),
      ('The 7 Habits of Highly Effective People', 'Stephen Covey', 4, 'Personal development', '2022-11-20', '0743269519'),
      ('How to Win Friends and Influence People', 'Dale Carnegie', 4, 'Social skills', '2023-03-10', '0671027577'),
      ('The Art of War', 'Sun Tzu', 4, 'Military strategy', '2023-06-05', '0143039691'),
      ('Meditations', 'Marcus Aurelius', 4, 'Stoic philosophy', '2024-02-08', '0140449337'),
      ('The Stoic Philosophy', 'Various', 4, 'Ancient wisdom', '2023-07-18', '0199235023'),
      ('Plato''s Republic', 'Plato', 3, 'Political philosophy', '2023-01-25', '0141442670'),
      ('Nicomachean Ethics', 'Aristotle', 3, 'Virtue and ethics', '2023-05-30', '0199213615'),
      ('The Analects', 'Confucius', 3, 'Ancient Chinese wisdom', '2023-08-10', '0140443487'),
      ('The Art of Happiness', 'Dalai Lama', 5, 'Buddhism and contentment', '2023-04-20', '1573221139'),
      ('The Power of Now', 'Eckhart Tolle', 4, 'Presence and mindfulness', '2022-09-15', '1577314808'),
      ('A New Earth', 'Eckhart Tolle', 4, 'Consciousness and transformation', '2023-11-25', '0452289803'),
      ('The Seven Spiritual Laws of Success', 'Deepak Chopra', 4, 'Spiritual growth', '2023-06-12', '0561906925'),
      ('Steal Like an Artist', 'Austin Kleon', 4, 'Creativity and inspiration', '2022-10-18', '0761169253'),
      ('Show Your Work', 'Austin Kleon', 4, 'Sharing your craft', '2023-07-22', '076116942X'),
      ('The War of Art', 'Steven Pressfield', 4, 'Overcoming resistance', '2023-09-08', '0385340338'),
      ('Big Magic', 'Elizabeth Gilbert', 4, 'Creativity and fear', '2024-01-18', '1594634718'),
      ('Mindset', 'Carol Dweck', 5, 'Growth vs fixed mindset', '2023-05-25', '0345472322'),
      ('The Courage to Be Disliked', 'Ichiro Kishimi', 4, 'Adlerian psychology', '2023-08-30', '178783265X'),
      ('Emotional Intelligence', 'Daniel Goleman', 4, 'EQ and relationships', '2023-02-14', '0553383647'),
      ('The Road Less Traveled', 'M. Scott Peck', 4, 'Spiritual growth', '2023-06-20', '0684847256'),
      ('Zen and the Art of Motorcycle Maintenance', 'Robert Pirsig', 4, 'Philosophy and quality', '2023-04-10', '0060589469'),
      ('Siddhartha', 'Hermann Hesse', 4, 'Spiritual journey', '2023-10-15', '0553283355'),
      ('Life is a Dream', 'Pedro Calderon', 3, 'Spanish drama', '2023-01-20', '048642386X'),
      ('The Little Prince', 'Antoine de Saint-Exupéry', 5, 'Fable and wisdom', '2024-02-20', '0156012197'),
      ('Charlotte''s Web', 'E.B. White', 5, 'Children''s classic', '2023-03-15', '0061124958'),
      ('Winnie-the-Pooh', 'A.A. Milne', 5, 'Childhood classic', '2023-11-10', '0141192186'),
      ('The Chronicles of Narnia', 'C.S. Lewis', 5, 'Fantasy world', '2023-12-05', '006027048X'),
      ('Matilda', 'Roald Dahl', 5, 'Children''s literature', '2024-01-25', '0142410721'),
      ('Where the Wild Things Are', 'Maurice Sendak', 5, 'Children''s imagination', '2023-09-20', '006083556X'),
      ('The Tale of Despereaux', 'Kate DiCamillo', 4, 'Fantasy adventure for kids', '2023-07-25', '0763615722'),
      ('A Wrinkle in Time', 'Madeleine L''Engle', 4, 'Science fiction for youth', '2023-05-10', '0312367554'),
      ('Bridge to Terabithia', 'Katherine Paterson', 4, 'Friendship and imagination', '2023-08-18', '0064401846'),
      ('The Boy in the Striped Pajamas', 'John Boyne', 5, 'Holocaust perspective', '2023-10-30', '0385751537'),
      ('Anne of Green Gables', 'L.M. Montgomery', 4, 'Coming of age classic', '2023-04-22', '0141321199');
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
