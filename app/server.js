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

let currUser = {};

app.use(fileUpload());

app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());
app.use(helmet());
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

let { PGUSER, PGDATA, PGPASSWORD, PGPORT, PGHOST } = process.env;
let pool = new Pool({ PGUSER, PGDATA, PGPASSWORD, PGPORT, PGHOST });

app.get("/", function (req, res, next) {
    if (typeof req.cookies.length === "undefined") {
        //Set cookie
        console.log("We must set a cookie");
        res.cookie("UserId", Math.random().toString(), "Username", "Default", {
            httpOnly: false,
            secure: false,
            sameSite: "none",
            maxAge: 900000,
            overwrite: true
        });
        currUser.username = req.cookies.Username;
    } else {
        //C is for cookie
        console.log("We have a cookie: ", req.cookies.length);
        currUser.username = req.cookies.Username;
    }
    next();
});

app.get("/", function (req, res) {
  return res.render("index", {
    currUser
  });
})

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

      // save the file information to your database if needed

      res.status(200).json({ message: "File uploaded successfully." });
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
