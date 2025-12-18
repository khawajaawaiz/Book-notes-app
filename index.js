import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

// PostgreSQL client
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Book Notes Tracker",
  password: "SQL@2025",
  port: 5432,
});

// Connect to DB
db.connect()
  .then(() => {
    console.log("✅ Connected to PostgreSQL");
  })
  .catch((err) => {
    console.error("❌ Database connection error", err);
  });

// Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// API Route
app.get("/api/books", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Database error");
  }
});

app.get("/", async (req, res) => {
  try {
    let sort = req.query.sort;
    let orderBy = "created_at DESC"; // default

    if (sort === "rating") {
      orderBy = "rating DESC";
    } else if (sort === "recent") {
      orderBy = "read_date DESC";
    } else if (sort === "title") {
      orderBy = "title ASC";
    }

    let query = "SELECT * FROM books";
    let params = [];

    if (req.query.search) {
      query += " WHERE title ILIKE $1";
      params.push(`%${req.query.search}%`);
      query += ` ORDER BY ${orderBy}`;
    } else {
      query += ` ORDER BY ${orderBy}`;
    }

    const result = await db.query(query, params);

    res.render("index.ejs", {
      books: result.rows,
      selectedSort: sort,
      message: req.query.message, // Pass success message to view
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error sorting books");
  }
});

// Render Add Book Page
app.get("/add", (req, res) => {
  res.render("new.ejs");
});

// Handle Add Book
app.post("/add", async (req, res) => {
  const { title, author, rating, read_date, isbn, notes } = req.body;

  // Validation
  if (!title || !author || !rating) {
    return res.render("new.ejs", {
      error: "Title, Author, and Rating are required."
    });
  }

  if (rating < 0 || rating > 5) {
    return res.render("new.ejs", {
      error: "Rating must be between 0 and 5."
    });
  }

  try {
    await db.query(
      `INSERT INTO books (title, author, rating, notes, read_date, isbn)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, author, rating, notes, read_date, isbn]
    );

    res.redirect("/?message=Book Added Successfully");

  } catch (err) {
    console.error(err);
    res.render("new.ejs", {
      error: "Could not save the book. Please try again."
    });
  }
});

// Handle Delete Book
app.post("/delete", async (req, res) => {
  try {
    const id = req.body.id;
    await db.query("DELETE FROM books WHERE id = $1", [id]);
    res.redirect("/?message=Book Deleted Successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting book");
  }
});

app.get("/edit/:id", async (req, res) => {
  try {
    const bookId = req.params.id;

    const result = await db.query(
      "SELECT * FROM books WHERE id = $1",
      [bookId]
    );

    res.render("edit.ejs", {
      book: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading book");
  }
});

// Handle Edit Book
app.post("/edit/:id", async (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, author, rating, notes, read_date, isbn } = req.body;

    await db.query(
      `UPDATE books 
       SET title = $1, author = $2, rating = $3, notes = $4, read_date = $5, isbn = $6
       WHERE id = $7`,
      [title, author, rating, notes, read_date, isbn, bookId]
    );

    res.redirect("/?message=Book Updated Successfully");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating book");
  }
});





app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});




