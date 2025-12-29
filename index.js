import express from "express";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

// PostgreSQL Pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.tvwwsnwfsybzeeulcxjb:HWW7s348UpZRZGKY@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

// Test DB Connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection error:", err);
  } else {
    console.log("✅ Connected to PostgreSQL (Pool)");
  }
});

const db = pool; // Alias for convenience in existing queries
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));


app.use(session({
  secret: process.env.SESSION_SECRET || "default_dev_secret", // Fallback for development/deployment without env
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Pass user to all views
app.use((req, res, next) => {
  res.locals.user = req.user;
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
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            if (err) {
              console.error(err);
              res.redirect("/login");
            } else {
              res.redirect("/");
            }
          });
        }
      });
    }
  } catch (err) {
    console.error(err);
    res.render("register.ejs", { error: "Error registering user" });
  }
});

app.get("/login", (req, res, next) => {
  if (req.query.code) {
    return passport.authenticate("google", {
      successRedirect: "/",
      failureRedirect: "/login",
    })(req, res, next);
  }
  res.render("login.ejs");
});

app.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
}));

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) console.error("Error logging out:", err);
    res.redirect("/login");
  });
});



passport.use(
  "local",
  new Strategy({ usernameField: "email" }, async function verify(email, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        if (!storedHashedPassword) {
          // User signed up with Google, so no password set
          return cb(null, false, { message: "Please log in with Google." });
        }
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false, { message: "Incorrect password." });
            }
          }
        });
      } else {
        return cb(null, false, { message: "User not found." });
      }
    } catch (err) {
      console.error("Database error during login:", err);
      return cb(err);
    }
  })
);

if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(
    "google",
    new GoogleStrategy.Strategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.NODE_ENV === 'production'
          ? "https://book-notes-app-ten.vercel.app/login"
          : "http://localhost:3000/auth/google/callback",
        passReqToCallback: true,
      },
      async (request, accessToken, refreshToken, profile, done) => {
        try {
          const result = await db.query("SELECT * FROM users WHERE email = $1", [
            profile.email,
          ]);
          if (result.rows.length === 0) {
            const newUser = await db.query(
              "INSERT INTO users (email, google_id, password) VALUES ($1, $2, $3) RETURNING *",
              [profile.email, profile.id, null] // Password is null for Google users
            );
            return done(null, newUser.rows[0]);
          } else {
            // User exists, update google_id if missing
            const user = result.rows[0];
            if (!user.google_id) {
              await db.query("UPDATE users SET google_id = $1 WHERE email = $2", [profile.id, profile.email]);
            }
            return done(null, user);
          }
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} else {
  console.warn("⚠️ Google Client ID not found. Google Auth strategy skipped.");
}

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);



passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = result.rows[0];
    if (user) {
      cb(null, user);
    } else {
      cb(new Error("User not found during deserialization"));
    }
  } catch (err) {
    cb(err);
  }
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// Middleware to check admin role
function isAdmin(req, res, next) {
  if (req.user && req.user.is_admin) {
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
    let params = [req.user.id];
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
    const userId = req.user.id;
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
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading favorites");
  }
});

app.post("/favorite", isAuthenticated, async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = req.user.id;

    if (!bookId) {
      return res.status(400).json({ error: "Missing bookId" });
    }

    const numericBookId = parseInt(bookId);

    // Check if already favorited
    const checkResult = await db.query(
      "SELECT id FROM favorites WHERE user_id = $1 AND book_id = $2",
      [userId, numericBookId]
    );

    if (checkResult.rows.length > 0) {
      await db.query(
        "DELETE FROM favorites WHERE user_id = $1 AND book_id = $2",
        [userId, numericBookId]
      );
      res.json({ success: true, favorited: false });
    } else {
      await db.query(
        "INSERT INTO favorites (user_id, book_id) VALUES ($1, $2)",
        [userId, numericBookId]
      );
      res.json({ success: true, favorited: true });
    }
  } catch (err) {
    console.error("Error in /favorite:", err);
    res.status(500).json({ error: "Database error" });
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





// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Unhandled Application Error:", err);
  // Ensure we pass 'message' to matching err.ejs expectation
  res.status(500).render("err.ejs", { message: err.message || "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});




