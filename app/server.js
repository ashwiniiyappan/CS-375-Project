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

let testUser = {};

app.use(fileUpload());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(helmet());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

let { PGUSER, PGDATA, PGPASSWORD, PGPORT, PGHOST } = process.env;
let pool = new Pool({ PGUSER, PGDATA, PGPASSWORD, PGPORT, PGHOST });
let username = "default";
let userid = "1234";

app.get("/", (req, res) => {
  pool.query("SELECT content.*, users.username FROM content JOIN users ON content.user_id = users.user_id ORDER BY content.view_count DESC")
        .then((result) => {
            const contentList = result.rows;

    if (req.cookies.UserID === undefined) {
        //No Cookie
        testUser = {};
        console.log("No cookies");
    } else {
        //C is for cookie
        console.log("Typeof cookie =", typeof req.cookies.userID);
        console.log("We have a cookie: ", req.cookies);
        testUser.userid = req.cookies.userID;
        testUser.username = req.cookies.Username;
    }
    res.render("index", {
      testUser,
      contentList
    });
  })
  .catch((error) => {
      console.error(error);
      res.status(500).send("Internal Server Error");
    });
});
app.post('/like/:contentId', async (req, res) => {
  try {
    const contentId = req.params.contentId;

    if (!req.cookies.UserID) {
      return res.redirect('/sign_in.html'); 
    }

    const userId = req.cookies.UserID;


    const existingInteraction = await pool.query('SELECT * FROM interactions WHERE user_id = $1 AND content_id = $2 AND liked = true', [userId, contentId]);

    if (existingInteraction.rows.length > 0) {
      return res.redirect('/');
    }

    const updateContentLikes = await pool.query('UPDATE content SET likes = likes + 1 WHERE content_id = $1 RETURNING likes', [contentId]);

    await pool.query('INSERT INTO interactions (user_id, content_id, liked) VALUES ($1, $2, $3)', [userId, contentId, true]);

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/dislike/:contentId', async (req, res) => {
  try {
    const contentId = req.params.contentId;

    if (!req.cookies.UserID) {
      return res.redirect('/sign_in.html'); 
    }

    const userId = req.cookies.UserID;

    const existingInteraction = await pool.query('SELECT * FROM interactions WHERE user_id = $1 AND content_id = $2 AND disliked = true', [userId, contentId]);

    if (existingInteraction.rows.length > 0) {
      return res.redirect('/');
    }

    const updateContentDislikes = await pool.query('UPDATE content SET dislikes = dislikes + 1 WHERE content_id = $1 RETURNING dislikes', [contentId]);

    await pool.query('INSERT INTO interactions (user_id, content_id, disliked) VALUES ($1, $2, $3)', [userId, contentId, true]);

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post("/profile_page", async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ message: "No files were uploaded." });
  }

  let file = req.files.file;

  let title = req.body.title || 'Untitled'; // Default to 'Untitled' if title is not provided

  let uploadPath = path.join(__dirname, "public/uploads", `${title}_${file.name}`);
  try {
    
    await file.mv(uploadPath);

   
    let userId = req.cookies.UserID;

    const insertResult = await pool.query(
      "INSERT INTO content (user_id, content_type, content_path, view_count, likes, dislikes, title) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING content_id",
      [userId, file.mimetype.startsWith("image") ? 'image' : 'video', `/uploads/${title}_${file.name}`, 0, 0, 0, title]
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
  let userId = req.cookies.UserID;

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
                pool.query("SELECT user_id FROM users WHERE username = $1", [username])
                  .then((result) => {
                    userid = result.rows[0].user_id;
                    res.cookie("UserID", userid, {
                      expires: new Date("31 December 2024"),
                      httpOnly: true
                    });
                    res.cookie("Username", username, {
                      expires: new Date("31 December 2024"),
                      httpOnly: true
                    })
                    res.redirect(`/`);
                  })
                  .catch((error) => {
                    console.log(error);
                    return res.status(500).send();
                  })
                
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
              pool.query("SELECT user_id FROM users WHERE username = $1", [username])
                .then((result) => {
                  userid = result.rows[0].user_id;
                  res.cookie("UserID", userid, {
                    expires: new Date("31 December 2024"),
                    httpOnly: true
                  });
                  res.cookie("Username", username, {
                    expires: new Date("31 December 2024"),
                    httpOnly: true
                  })
                  res.redirect(`/`); // Redirect to "/index" on successful sign-in
                })
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

app.get("/signout", (req, res) => {
  res.clearCookie("Username");
  res.clearCookie("UserID");
  res.redirect("/");
})

app.get('/content_view', async (req, res) => {

    console.log('Query Parameters:', req.query);

    const contentId = req.query.content_id;
    console.log(contentId);
    pool.query("SELECT user_id, content_type, content_path, view_count, likes, dislikes, title FROM content WHERE content_id = $1", [contentId])
        .then((result) => {
            const content = result.rows[0];
            res.render('content_view', { content })
            })
        .catch((error) => {
            res.status(404).send('Content not found');
        })
});

app.post("/search", (req, res) => {
  currQuery = req.body.searchQuery;
  resultList = [];
  console.log("Body:", currQuery);
  pool.connect().then(() => {
    pool.query("SELECT * FROM content WHERE title = $1", [currQuery])
    .then(async (result) => {
      console.log(result);
      resultList.push(result.rows[0].title);
      console.log(resultList);
      while (currQuery.length > 0) {
        await pool.query("SELECT * FROM content WHERE title LIKE '%" + currQuery + "%'")
        .then((result) => {
          console.log(result)
          for (let element of result.rows) {
            // console.log("element:", element);
            if (!resultList.includes(element.title)) {
              resultList.push(element.title);
              console.log(resultList);
            }
          }
        })
        .catch((error) => {
          console.log(error);
          res.status(500).send("Internal Server Error");
          currQuery = "";
        })
  
        currQuery = currQuery.substring(0, currQuery.length - 1);
      }
      console.log("resultList:", resultList);
      res.render("search_results", {
        testUser,
        resultList
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send("Internal Server Error");
    })
  })
})

pool.connect().then(() => {
    pool.query("SELECT * FROM content").then(result => {
        console.log(result.rows);
    })
})

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});
