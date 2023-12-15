DROP DATABASE IF EXISTS dragons_den;
CREATE DATABASE dragons_den;
\c dragons_den;
CREATE TABLE users (
user_id SERIAL PRIMARY KEY,
username VARCHAR(20),
password VARCHAR(60),
watch_history_ids INT[]
);
CREATE TABLE content (
content_id SERIAL PRIMARY KEY,
user_id INT,
content_type VARCHAR(10),
content_path VARCHAR(255),
/*content_file (Unknown, might store seperately with a file path link)*/
view_count INT,
likes INT,
dislikes INT,
title VARCHAR(255)
);
CREATE TABLE interactions (
interaction_id SERIAL PRIMARY KEY,
user_id INT,
content_id INT,
liked BOOLEAN,
disliked BOOLEAN
);
CREATE TABLE playlists (
	playlist_id SERIAL PRIMARY KEY,
	user_id INT,
	content_ids INT[],
	title VARCHAR(255)
);
