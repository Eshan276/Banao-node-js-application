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
  user: "sql6705002",
  password: "6ZcMCkw3zW",
  database: "sql6705002",
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
        "INSERT INTO user_Table (email, username, password,postcount) VALUES (?, ?, ?,?)";
      connection.query(
        insertUserQuery,
        [email, username, password, 0],
        (err) => {
          if (err) {
            console.error("Error registering user:", err);
            return res.status(500).json({ message: "Internal server error" });
          }
          res.status(201).json({ message: "User registered successfully" });
        }
      );
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
async function updatePostCount(username) {
  username = String(username);
  console.log("username", username);
  return new Promise((resolve, reject) => {
    const postCountQuery =
      "SELECT postcount FROM user_Table WHERE username = ?";
    connection.query(postCountQuery, [username], (err, results) => {
      if (err) {
        console.error("Error checking if user exists:", err);
        reject({ status: 500, message: "Internal server error" });
      } else if (results.length === 0) {
        reject({ status: 404, message: "User not found" });
      } else {
        const postcount = results[0].postcount;
        resolve(postcount);
      }
    });
  });
}

app.post("/addpost", (req, res) => {
  const { username, post_data } = req.body;

  // Query to get the current post count
  const postCountQuery = "SELECT postcount FROM user_Table WHERE username = ?";
  connection.query(postCountQuery, [username], (err, results) => {
    if (err) {
      console.error("Error checking if user exists:", err);
      return res.status(500).json({ message: "Internal server error" });
    } else if (results.length === 0) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    } else {
      const postcount = results[0].postcount;

      // Insert the post into the post_Table
      const comment = "";
      const insertPostQuery =
        "INSERT INTO post_Table (post_id, username, post_data, likes,comment_list) VALUES (?, ?, ?, ?,?)";
      connection.query(
        insertPostQuery,
        [username + "_" + postcount, username, post_data, 0, comment],
        (err) => {
          if (err) {
            console.error("Error adding post:", err);
            return res.status(500).json({ message: "Internal server error" });
          }

          // Increment the post count and update the user_Table
          const updatedPostCount = postcount + 1;
          const updatePostCountQuery =
            "UPDATE user_Table SET postcount = ? WHERE username = ?";
          connection.query(
            updatePostCountQuery,
            [updatedPostCount, username],
            (err) => {
              if (err) {
                console.error("Error updating post count:", err);
                return res.status(500).json({
                  message: "Internal server error while updating post count",
                });
              }
              res.status(201).json({ message: "Post added successfully" });
            }
          );
        }
      );
    }
  });
});
app.post("/addlike", (req, res) => {
  const { post_id, param } = req.body;

  // Query to get the current likes
  const likeCountQuery = "SELECT likes FROM post_Table WHERE post_id = ?";
  connection.query(likeCountQuery, [post_id], (err, results) => {
    if (err) {
      console.error("Error checking if post exists:", err);
      return res.status(500).json({ message: "Internal server error" });
    } else if (results.length === 0) {
      console.log("Post not found");
      return res.status(404).json({ message: "Post not found" });
    } else {
      const likes = results[0].likes;

      // Increment the likes and update the post_Table
      let updatedLikes;
      if (Number(param) == 1) {
        updatedLikes = likes + 1;
      } else {
        console.log("parffam", param);
        updatedLikes = likes - 1;
      }
      console.log("param", param);

      const updateLikesQuery =
        "UPDATE post_Table SET likes = ? WHERE post_id = ?";
      connection.query(updateLikesQuery, [updatedLikes, post_id], (err) => {
        if (err) {
          console.error("Error updating likes:", err);
          return res.status(500).json({
            message: "Internal server error while updating likes",
          });
        }
        res.status(201).json({ message: "Like added successfully" });
      });
    }
  });
});
app.get("/getposts", (req, res) => {
  const getPostsQuery = "SELECT * FROM post_Table";
  connection.query(getPostsQuery, (err, results) => {
    if (err) {
      console.error("Error getting posts:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
    res.json(results);
  });
});
app.post("/addcomment", (req, res) => {
  const { post_id, comment } = req.body;
  console.log("post_id", post_id);
  // Query to get the current comment list
  const commentListQuery =
    "SELECT comment_list FROM post_Table WHERE post_id = ?";
  connection.query(commentListQuery, [post_id], (err, results) => {
    if (err) {
      console.error("Error checking if post exists:", err);
      return res.status(500).json({ message: "Internal server error" });
    } else if (results.length === 0) {
      console.log("Post not found");
      return res.status(404).json({ message: "Post not found" });
    } else {
      const comment_list = results[0].comment_list;
      console.log("comment_list", comment_list);
      const updatedCommentList = comment_list + "_" + comment;
      console.log("updatedCommentList", updatedCommentList);

      const updateCommentListQuery =
        "UPDATE post_Table SET comment_list = ? WHERE post_id = ?";
      connection.query(
        updateCommentListQuery,
        [updatedCommentList, post_id],
        (err) => {
          if (err) {
            console.error("Error updating comment:", err);
            return res.status(500).json({
              message: "Internal server error while updating comment",
            });
          }
          res.status(201).json({ message: "Comment added successfully" });
        }
      );
    }
  });
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
