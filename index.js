import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";

const app = express();
const port = 3000;
const saltRounds = 10;

// PostgreSQL client
const db = new pg.Client({
  connectionString: "postgresql://postgres.tvwwsnwfsybzeeulcxjb:HWW7s348UpZRZGKY@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres",
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
app.use(session({
  secret: "TOPSECRETWORD", // In production, this should be in an environment variable
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Pass user to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// Authentication Routes
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (checkResult.rows.length > 0) {
      res.render("register.ejs", { error: "You already registered" });
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.render("register.ejs", { error: "Error registering user" });
        } else {
          await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [email, hash]
          );
          res.redirect("/login");
        }
      });
    }
  } catch (err) {
    console.error(err);
    res.render("register.ejs", { error: "Error registering user" });
  }
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/login", async (req, res) => {
  const email = req.body.email;
  const loginPassword = req.body.password;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      bcrypt.compare(loginPassword, storedHashedPassword, (err, result) => {
        if (err) {
          console.error("Error comparing passwords:", err);
          return res.render("login.ejs", { error: "Error logging in" });
        } else {
          if (result) {
            req.session.user = {
              id: user.id,
              email: user.email,
              is_admin: user.is_admin
            };
            res.redirect("/");
          } else {
            res.render("login.ejs", { error: "Incorrect Password" });
          }
        }
      });
    } else {
      res.render("login.ejs", { error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.render("login.ejs", { error: "Error logging in" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Error destroying session:", err);
    res.redirect("/login");
  });
});

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

// Middleware to check admin role
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.is_admin) {
    return next();
  }
  res.redirect("/?error=Unauthorized: Admin access required");
}

// API Route
app.get("/api/books", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Database error");
  }
});

app.get("/", isAuthenticated, async (req, res) => {
  try {
    let sort = req.query.sort;
    let page = parseInt(req.query.page) || 1;
    const itemsPerPage = 12;
    let orderBy = "created_at DESC"; // default

    if (sort === "rating") {
      orderBy = "rating DESC";
    } else if (sort === "recent") {
      orderBy = "read_date DESC";
    } else if (sort === "title") {
      orderBy = "title ASC";
    }

    let query = `
      SELECT books.*, 
      EXISTS (SELECT 1 FROM favorites WHERE user_id = $1 AND book_id = books.id) AS is_favourite
      FROM books
    `;
    let countQuery = "SELECT COUNT(*) FROM books";
    let params = [req.session.user.id];
    let countParams = [];

    if (req.query.search) {
      query += " WHERE title ILIKE $2";
      countQuery += " WHERE title ILIKE $1";
      params.push(`%${req.query.search}%`);
      countParams.push(`%${req.query.search}%`);
    }

    // Get total count
    const countResult = await db.query(countQuery, countParams);
    const totalBooks = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalBooks / itemsPerPage);

    // Ensure page is valid
    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;

    const offset = (page - 1) * itemsPerPage;
    query += ` ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(itemsPerPage, offset);

    const result = await db.query(query, params);

    res.render("index.ejs", {
      books: result.rows,
      selectedSort: sort,
      message: req.query.message,
      currentPage: page,
      totalPages: totalPages,
      totalBooks: totalBooks,
      search: req.query.search || "",
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error sorting books");
  }
});

// Render Add Book Page
app.get("/add", isAuthenticated, isAdmin, (req, res) => {
  res.render("new.ejs");
});

// Handle Add Book
app.post("/add", isAuthenticated, isAdmin, async (req, res) => {
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
app.post("/delete", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = req.body.id;
    await db.query("DELETE FROM books WHERE id = $1", [id]);
    res.redirect("/?message=Book Deleted Successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting book");
  }
});

// Favorites Routes
app.get("/favorites", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const result = await db.query(
      `SELECT books.*, true as is_favourite 
       FROM books 
       JOIN favorites ON books.id = favorites.book_id 
       WHERE favorites.user_id = $1 
       ORDER BY favorites.id DESC`,
      [userId]
    );

    res.render("favorites.ejs", {
      books: result.rows,
      user: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading favorites");
  }
});

app.post("/favorite", isAuthenticated, async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = req.session.user.id;

    // Check if already favorited
    const checkResult = await db.query(
      "SELECT * FROM favorites WHERE user_id = $1 AND book_id = $2",
      [userId, bookId]
    );

    if (checkResult.rows.length > 0) {
      // Remove from favorites
      await db.query(
        "DELETE FROM favorites WHERE user_id = $1 AND book_id = $2",
        [userId, bookId]
      );
      res.json({ success: true, favorited: false });
    } else {
      // Add to favorites
      await db.query(
        "INSERT INTO favorites (user_id, book_id) VALUES ($1, $2)",
        [userId, bookId]
      );
      res.json({ success: true, favorited: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update favorites" });
  }
});


app.get("/edit/:id", isAuthenticated, isAdmin, async (req, res) => {
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
app.post("/edit/:id", isAuthenticated, isAdmin, async (req, res) => {
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




