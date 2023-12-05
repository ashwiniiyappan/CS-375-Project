let express = require("express");
let { Pool } = require("pg");
let fileUpload = require("express-fileupload");
let path = require("path");
let bcrypt = require("bcrypt");
let cookieParser = require("cookie-parser");
let helmet = require("helmet");

// env-cmd expects .env in current directory
// so npm run start can't include cd app
// but if we don't change directory to script directory
// all relative paths will break (or need to be prefaced with app/)
process.chdir(__dirname)

let hostname = "localhost";
let port = 3000;
let app = express();

let testUser = {
    username: "testUsername"
}

app.use(fileUpload());

app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());
app.use(helmet());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

let { PGUSER, PGDATA, PGPASSWORD, PGPORT, PGHOST } = process.env;
let pool = new Pool({ PGUSER, PGDATA, PGPASSWORD, PGPORT, PGHOST });

app.get("/", function (req, res) {
    if (typeof req.cookies === "undefined") {
        //Set cookie
        console.log("We must set a cookie");
        res.cookie("Name", Math.random().toString(), {
            httpOnly: false,
            secure: false,
            sameSite: "none",
            maxAge: 900000
        });
    } else {
        //C is for cookie
        console.log("We have a cookie: ", req.cookies);
    }
    res.render("index", {
        testUser
    });
});

app.post("/profile_page", async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ message: "No files were uploaded." });
  }

  let file = req.files.file;

  let uploadPath = path.join(__dirname, "public/uploads", file.name);

  try {
    
    await file.mv(uploadPath);

   
    let userId = 1;

    const insertResult = await pool.query(
      "INSERT INTO content (user_id, content_type, content_path, view_count, likes, dislikes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING content_id",
      [userId, 'file', '/uploads/' + file.name, 0, 0, 0]
    );

    let contentId = insertResult.rows[0].content_id;

   
    const fetchResult = await pool.query("SELECT * FROM content WHERE user_id = $1", [userId]);
    let contentList = fetchResult.rows;

    
    res.render("profile_page", { contentList });
  } catch (error) {
    // Handle errors
    console.log(error);
    res.status(500).send();
  }
});


app.get("/profile_page", (req, res) => {
    let userId = 1;
  
    pool.query("SELECT * FROM content WHERE user_id = $1", [userId])
      .then((result) => {
        let contentList = result.rows;
  
        res.render("profile_page", { contentList });
      })
      .catch((error) => {
        console.log(error);
        res.status(500).send("Internal Server Error");
      });
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
        bcrypt.hash(plaintextPassword, 10)
          .then((hashedPassword) => {
            pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, hashedPassword])
              .then(() => {
                // Account created
                console.log(username, "account created");
                res.redirect(`/`);
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
        console.log("username doesn't exist");
        res.status(401).send("Username not found");
      } else {
        let hashedPassword = result.rows[0].password;
        bcrypt
          .compare(plaintextPassword, hashedPassword)
          .then((passwordMatched) => {
            if (passwordMatched) {
              console.log("signed in");
              res.redirect("/"); // Redirect to "/index" on successful sign-in
            } else {
              console.log("incorrect password");
              res.status(401).send("Incorrect password");
            }
          })
          .catch((error) => {
            // bcrypt crashed
            console.log(error);
            res.status(500).send("Internal Server Error");
          });
      }
    })
    .catch((error) => {
      // select crashed
      console.log(error);
      res.status(500).send("Internal Server Error");
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
