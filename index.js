const querystring = require("querystring");
const express = require("express");
const redis = require("redis");
const got = require("got");

const app = express();
const db = redis.createClient();

app.use(express.static(__dirname + "/static"));

app.get("/search", function(req, res, next) {
	if(req.query.q.length < 3) return res.end();

	db.get("q:" + req.query.q, function(err, db_albums) {
		if(db_albums) return res.end(db_albums);

		const url = "https://api.spotify.com/v1/search?" + querystring.stringify({
			client_id: "2d385c26d9b74fd6ac9e0fd7a3d47d02",
			type: "album",
			q: req.query.q
		});

		got(url).then(function(response) {
			const albums = JSON.parse(response.body).albums.items.map(function(album) {
				return {
					name: album.name,
					image: album.images[0].url
				}
			});

			const albums_json = JSON.stringify(albums);

			db.multi()
				.set("q:" + req.query.q, albums_json)
				.expire("q:" + req.query.q, 60 * 60 * 24)
				.exec(function() {
				res.end(albums_json);
			});
		}).catch(function(error) {
			console.log(error);
			res.end();
		});
	});
});

app.listen(8080);
