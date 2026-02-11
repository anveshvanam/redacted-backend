require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./db");

async function createAdmin() {
  const username = "admin";
  const password = "admin123";

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO admins (username, password_hash) VALUES ($1, $2)",
    [username, hash]
  );

  console.log("Admin created");
  process.exit();
}

createAdmin();
