const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const mysql = require("mysql");
const cors = require("cors"); // Import cors package

const app = express();
const PORT = 3000;

// Database connection configuration
const connection = mysql.createConnection({
  host: "sql6.freesqldatabase.com",
  user: "sql6703325",
  password: "WGREl8p8ag",
  database: "sql6703325",
  port: 3306,
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    return;
  }
  console.log("Connected to database");
});

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Enable CORS for all routes
app.use(cors());

// User Registration Endpoint
app.post("/register", (req, res) => {
  try {
    const { email, password, username } = req.body;
    console.log(email, username, password);
    // Check if user already exists
    const userExistsQuery =
      "SELECT * FROM user_Table WHERE email = ? OR username = ?";
    connection.query(userExistsQuery, [email, username], (err, results) => {
      if (err) {
        console.error("Error checking if user exists:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      if (results.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Save user to database
      const insertUserQuery =
        "INSERT INTO user_Table (email, username, password) VALUES (?, ?, ?)";
      connection.query(insertUserQuery, [email, username, password], (err) => {
        if (err) {
          console.error("Error registering user:", err);
          return res.status(500).json({ message: "Internal server error" });
        }
        res.status(201).json({ message: "User registered successfully" });
      });
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// User Login Endpoint
app.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username and password
    const getUserQuery =
      "SELECT * FROM user_Table WHERE username = ? AND password = ?";
    connection.query(getUserQuery, [username, password], (err, results) => {
      if (err) {
        console.error("Error finding user:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      if (results.length === 0) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ username: results[0].username }, "secret_key");
      res.json({ token });
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Forget Password Endpoint (simplified)
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  // Find user by email
  const getUserQuery = "SELECT * FROM user_Table WHERE email = ?";
  connection.query(getUserQuery, [email], (err, results) => {
    if (err) {
      console.error("Error finding user:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = results[0];

    // Simulate sending password reset email with token
    const token = jwt.sign({ email: user.email }, "reset_key", {
      expiresIn: "1h",
    });
    return res.json({ message: "Password reset email sent", token });
  });
});

// Reset Password Endpoint
// app.post("/reset-password", (req, res) => {
//   const { token, newPassword } = req.body;

//   // Verify token
//   jwt.verify(token, "reset_key", (err, decoded) => {
//     if (err) {
//       return res.status(401).json({ message: "Invalid or expired token" });
//     }

//     const { email } = decoded;

//     // Update user's password in database (simplified)
//     const updateUserQuery =
//       "UPDATE user_Table SET password = ? WHERE email = ?";
//     connection.query(updateUserQuery, [newPassword, email], (err) => {
//       if (err) {
//         console.error("Error updating password:", err);
//         return res.status(500).json({ message: "Internal server error" });
//       }
//       return res.json({ message: "Password reset successfully" });
//     });
//   });
// });
app.post("/reset-password", (req, res) => {
  const { email, newPassword } = req.body;

  // Update user's password in database
  const updateUserQuery = "UPDATE user_Table SET password = ? WHERE email = ?";
  connection.query(updateUserQuery, [newPassword, email], (err, result) => {
    if (err) {
      console.error("Error updating password:", err);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (result.affectedRows === 0) {
      // If no rows were affected, the email doesn't exist
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "Password updated successfully" });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
