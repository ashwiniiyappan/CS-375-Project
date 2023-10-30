CREATE DATABASE Dragons_Den;
\c Dragons_Den;
CREATE TABLE users (
user_id INT PRIMARY KEY,
username VARCHAR(20),
password hashed_password VARCHAR(60)
);
CREATE TABLE content (
content_id INT PRIMARY KEY,
user_id INT,
content_type VARCHAR(10),
/*content_file (Unknown, might store seperately with a file path link)*/
view_count INT,
likes INT,
dislikes INT
);
CREATE TABLE interactions (
user_id INT PRIMARY KEY,
content_id INT,
comment_text VARCHAR(250),
liked BOOLEAN,
disliked BOOLEAN
);
