// seed-db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";

(async () => {
    if (!fs.existsSync("./db")) fs.mkdirSync("./db");

    const db = await open({
        filename: "./db/hashbank.db",
        driver: sqlite3.Database,
    });

    await db.exec(`
    create table if not exists comparisons (
      id integer primary key autoincrement,
      file1_hash text,
      file2_hash text,
      match boolean,
      created_at timestamp default current_timestamp
    );
  `);

    // clear any old data
    await db.exec("delete from comparisons;");

    // insert defaults
    const rows = [
        ["111111", "111111", true],
        ["111111", "000000", false],
        ["000000", "111111", false],
    ];

    for (const [a, b, m] of rows) {
        await db.run(
            "insert into comparisons (file1_hash, file2_hash, match) values (?, ?, ?)",
            [a, b, m]
        );
    }

    console.log("✅ hashbank.db created with 3 sample rows.");
    await db.close();
})();
