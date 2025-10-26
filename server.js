import express from "express";
import multer from "multer";
import crypto from "crypto";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });

// serve static files from /public
app.use(express.static("public"));

// initialize SQLite database
const dbPromise = open({
    filename: "./db/hashbank.db",
    driver: sqlite3.Database,
});

// create comparisons table (auto-add missing columns)
(async () => {
    const db = await dbPromise;
    await db.run(`
    CREATE TABLE IF NOT EXISTS comparisons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file1_hash TEXT,
      file2_hash TEXT,
      file1_path TEXT,
      file2_path TEXT,
      match BOOLEAN,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // ensure columns exist
    const cols = await db.all(`PRAGMA table_info(comparisons);`);
    const colNames = cols.map(c => c.name);
    if (!colNames.includes("file1_path")) {
        await db.run("ALTER TABLE comparisons ADD COLUMN file1_path TEXT;");
        await db.run("ALTER TABLE comparisons ADD COLUMN file2_path TEXT;");
    }

    console.log("📦 Database initialized successfully.");
})();

// hash a file using SHA-256
function hashFile(filePath) {
    const data = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(data).digest("hex");
}

// handle image comparison + store to db
app.post("/compare", upload.array("images", 2), async (req, res) => {
    const [file1, file2] = req.files;
    const hash1 = hashFile(file1.path);
    const hash2 = hashFile(file2.path);
    const match = hash1 === hash2;

    // move files into /public/cache for persistent access
    const cacheDir = "./public/cache";
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const file1Cache = path.join(cacheDir, `${Date.now()}_1_${file1.originalname}`);
    const file2Cache = path.join(cacheDir, `${Date.now()}_2_${file2.originalname}`);

    fs.renameSync(file1.path, file1Cache);
    fs.renameSync(file2.path, file2Cache);

    // save to db (using relative path for vault display)
    const db = await dbPromise;
    await db.run(
        "INSERT INTO comparisons (file1_hash, file2_hash, file1_path, file2_path, match) VALUES (?, ?, ?, ?, ?)",
        [
            hash1,
            hash2,
            file1Cache.replace("public/", ""),
            file2Cache.replace("public/", ""),
            match,
        ]
    );

    res.redirect("/vault");
});



// fetch all comparisons (for vault view)
app.get("/api/vault", async (req, res) => {
    const db = await dbPromise;
    const rows = await db.all("SELECT * FROM comparisons ORDER BY created_at DESC");
    res.json(rows);
});

// -------- STATIC ROUTES --------
app.get("/", (req, res) => {
    res.sendFile(path.resolve("./public/index.html"));
});

app.get("/vault", (req, res) => {
    res.sendFile(path.resolve("./public/vault.html"));
});

app.get("/scanner", (req, res) => {
    res.sendFile(path.resolve("./public/scanner.html"));
});

app.get("/history", (req, res) => {
    res.sendFile(path.resolve("./public/history.html"));
});

app.get("/figma", (req, res) => {
    res.sendFile(path.resolve("./public/figma.html"));
});

// catch-all
app.use((req, res) => {
    res.status(404).send("<h1 style='font-family: monospace; color:#fff;'>404 — page not found</h1>");
});

// --- single file upload & store in db ---
app.post("/upload-hash", upload.single("image"), async (req, res) => {
    try {
        const { hash } = req.body;
        const filePath = req.file ? req.file.path : null;

        if (!hash || !filePath) {
            return res.status(400).send("Missing file or hash");
        }

        // insert into DB
        const timestamp = new Date().toLocaleString();
        db.run(
            `INSERT INTO history (file1, file2, match, time) VALUES (?, ?, ?, ?)`,
            [filePath, null, "single upload", timestamp],
            (err) => {
                if (err) {
                    console.error("DB insert error:", err);
                    return res.status(500).send("Database error");
                }
                res.status(200).send("Hash stored successfully");
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});


// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 DeepDetector running at http://localhost:${PORT}`);
});
