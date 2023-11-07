const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
let env = require(".env");

const app = express();
const port = 3000;

app.use(bodyParser.json());

let pool = new Pool(env);
pool.connect().then(() => {
  console.log("Connected to database");
});


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
        bcrypt.hash(plaintextPassword, saltRounds)
          .then((hashedPassword) => {
            pool.query("INSERT INTO users (,username, hashed_password) VALUES ($1, $2)", [username, hashedPassword])
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
    .query("SELECT hashed_password FROM users WHERE username = $1", [username])
    .then((result) => {
      if (result.rows.length === 0) {
        // username doesn't exist
        return res.status(401).send();
      }
      let hashedPassword = result.rows[0].hashed_password;
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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});