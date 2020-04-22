const assert = require("chai").assert;
const scrape = require("../index");


const SEARCH_QUERY = "Never gonna give you up";
const VIDEO_ID = "dQw4w9WgXcQ";
const PLAYLIST_ID = "PLx65qkgCWNJIgVrndMrhsedBz1VDp0kfm";


describe("index", async function() {

	describe("search", function () {
		it("search result should be 3", async function() {
			let videos = await scrape.search(SEARCH_QUERY, {limit: 3});
			assert.equal(videos.length, 3);
		});
	
		it("first search result id should be " + VIDEO_ID, async function() {
			let videos = await scrape.search(SEARCH_QUERY, {limit: 1});
			assert.equal(videos[0].id, VIDEO_ID);
		});
	});


	it("getPlaylist 1st video title", async function() {
		let playlist = await scrape.getPlaylist(PLAYLIST_ID);
		assert.equal(playlist.videos[0].title, "Poopy-di Scoop");
	});

	it("getVideo title of " + VIDEO_ID, async function() {
		let video = await scrape.getVideo(VIDEO_ID);
		assert.equal(video.title, "Rick Astley - Never Gonna Give You Up (Video)");
	});

	it("getRelated should be 3", async function() {
		let videos = await scrape.getRelated(VIDEO_ID, 3);
		assert.equal(videos.length, 3);
		assert.lengthOf(videos[0].id, 11);
	});

	it("getUpNext exists", async function() {
		let video = await scrape.getUpNext(VIDEO_ID);
		assert.lengthOf(video.id, 11);
	});

});