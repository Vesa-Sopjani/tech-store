const express = require("express");
const router = express.Router();
// const db = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Add the validate endpoint that your frontend is requesting
router.get("/validate", (req, res) => {
  // For now, return mock validation
  res.json({
    isAuthenticated: false,
    user: null,
    message: "Auth validation endpoint"
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // For now, return mock response until database is set up
  if (email === "admin@example.com" && password === "admin123") {
    const token = jwt.sign(
      { id: 1, role: "admin", email: "admin@example.com" },
      process.env.JWT_SECRET || "fallback-secret-key",
      { expiresIn: "1d" }
    );
    
    return res.json({ 
      token, 
      user: {
        id: 1,
        email: "admin@example.com",
        role: "admin",
        name: "Admin User"
      }
    });
  }
  
  res.status(401).json({ message: "Invalid credentials" });
});

module.exports = router;