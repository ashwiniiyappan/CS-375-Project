let express = require("express");
let { Pool } = require("pg");
let fileUpload = require("express-fileupload");
let path = require("path");
let bcrypt = require("bcrypt");

// env-cmd expects .env in current directory
// so npm run start can't include cd app
// but if we don't change directory to script directory
// all relative paths will break (or need to be prefaced with app/)
process.chdir(__dirname)

let hostname = "localhost";
let port = 3000;
let app = express();

app.use(fileUpload());

app.use(express.json());
app.use(express.static("public"));

let { PGUSER, PGDATA, PGPASSWORD, PGPORT, PGHOST } = process.env;
let pool = new Pool({ PGUSER, PGDATA, PGPASSWORD, PGPORT, PGHOST });

app.post("/api", (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: "No files were uploaded." });
  }

  let file = req.files.file; 

  let uploadPath = path.join(__dirname, "public/uploads", file.name);

  file.mv(uploadPath, (err) => {
      if (err) {
          return res.status(500).send(err);
      }

      res.status(200).json({ message: "File uploaded successfully." });
    });
  });
  

     /* pool.query(
        "INSERT INTO content (user_id, content_type, content_file, view_count, likes, dislikes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING content_id",
      [1, 'file', uploadPath, 0, 0, 0]
      )
      .then((result) => {
        let contentId = result.rows[0].content_id;

        // File information saved to the database
        res.status(200).json({ message: "File uploaded successfully.", contentId });
      })
      .catch((error) => {
        // Insert query failed
        console.log(error);
        res.status(500).send();
      });
  });
});
*/
app.post("/signup", (req, res) => {
  let username = req.body.username;
  let plaintextPassword = req.body.plaintextPassword;

  if (!username || !plaintextPassword) {
    return res.status(401).send();
  }

  if (typeof username !== "string" || typeof plaintextPassword !== "string") {
    return res.status(401).send();
  }

  if (username.length < 1 || username.length > 25) {
    return res.status(401).send();
  }

  if (plaintextPassword.length < 5 || plaintextPassword.length > 36) {
    return res.status(401).send();
  }

  pool.query("SELECT username FROM users WHERE username = $1", [username])
    .then((result) => {
      if (result.rows.length > 0) {
        return res.status(401).send();
      } else {
        bcrypt.hash(plaintextPassword, 10)
          .then((hashedPassword) => {
            pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, hashedPassword])
              .then(() => {
                // Account created
                console.log(username, "account created");
                return res.status(200).send();
              })
              .catch((error) => {
                // Insert failed
                console.log(error);
                return res.status(500).send();
              });
          })
          .catch((error) => {
            // Bcrypt crashed
            console.log(error);
            return res.status(500).send();
          });
      }
    })
    .catch((error) => {
      // Select crashed
      console.log(error);
      return res.status(500).send();
    });
});

app.post("/signin", (req, res) => {
  let username = req.body.username;
  let plaintextPassword = req.body.plaintextPassword;
  pool
    .query("SELECT password FROM users WHERE username = $1", [username])
    .then((result) => {
      if (result.rows.length === 0) {
        // username doesn't exist
        return res.status(401).send();
      }
      let hashedPassword = result.rows[0].password;
      bcrypt
        .compare(plaintextPassword, hashedPassword)
        .then((passwordMatched) => {
          if (passwordMatched) {
            res.status(200).send();
          } else {
            res.status(401).send();
          }
        })
        .catch((error) => {
          // bcrypt crashed
          console.log(error);
          res.status(500).send();
        });
    })
    .catch((error) => {
      // select crashed
      console.log(error);
      res.status(500).send();
    });
});

pool.connect().then(() => {
    pool.query("SELECT * FROM content").then(result => {
        console.log(result.rows);
    })
})

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
