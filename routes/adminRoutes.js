const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const authenticateAdmin = require("../middleware/authMiddleware");

const router = express.Router();

/* Admin Login */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM admins WHERE username = $1",
    [username]
  );

  if (!result.rows.length) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const admin = result.rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);

  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { adminId: admin.id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

/* Add Prompt */
router.post("/prompts", authenticateAdmin, async (req, res) => {
  const { text } = req.body;

  await pool.query(
    "INSERT INTO prompts (text) VALUES ($1)",
    [text]
  );

  res.json({ message: "Prompt added" });
});

/* Get Prompts */
router.get("/prompts", authenticateAdmin, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM prompts ORDER BY created_at DESC"
  );

  res.json(result.rows);
});

/* Deactivate Prompt */
router.patch("/prompts/:id/deactivate", authenticateAdmin, async (req, res) => {
  await pool.query(
    "UPDATE prompts SET is_active = false WHERE id = $1",
    [req.params.id]
  );

  res.json({ message: "Prompt deactivated" });
});

module.exports = router;
