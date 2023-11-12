DROP DATABASE IF EXISTS dragons_den;
CREATE DATABASE dragons_den;
\c dragons_den;
CREATE TABLE users (
user_id SERIAL PRIMARY KEY,
username VARCHAR(20),
password VARCHAR(60)
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
