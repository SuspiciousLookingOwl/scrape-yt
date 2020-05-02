const assert = require("chai").use(require("chai-string")).assert;
const scrape = require("../dist/index").scrapeYt;


const SEARCH_QUERY = "Never gonna give you up";
const VIDEO_ID = "dQw4w9WgXcQ";
const PLAYLIST_ID = "PLx65qkgCWNJIgVrndMrhsedBz1VDp0kfm";

function orNull(val, type){
	return typeof val === type || val === null;
}


describe("index", () => {

	describe("search", () => {	
		let videos;
		before(async () => {
			videos = await scrape.search(SEARCH_QUERY, {limit: 3});
		});
		it("search result should be 3", () => {
			assert.equal(videos.length, 3);
		});
		it("match 1st video from search result", () => {
			const video = videos[0];
			assert.equal(video.id, VIDEO_ID);
			assert.equal(video.title, "Rick Astley - Never Gonna Give You Up (Video)");
			assert.equal(video.duration, 213);
			assert.startsWith(video.thumbnail, "https://i.ytimg.com/");
			assert.typeOf(video.channel.id, "string");
			assert.typeOf(video.channel.name, "string");
			assert.typeOf(video.channel.url, "string");
			assert.typeOf(video.uploadDate, "string");
			assert.isAbove(video.viewCount, 680000000);
		});
	});

	it("match getPlaylist result", async () => {
		const playlist = await scrape.getPlaylist(PLAYLIST_ID);
		assert.equal(playlist.id, PLAYLIST_ID);
		assert.equal(playlist.title, "Very Important Videos");
		assert.typeOf(playlist.videoCount, "number");
		assert.isAbove(playlist.viewCount, 150000);
		assert.typeOf(playlist.lastUpdatedAt, "string");
		assert.typeOf(playlist.channel.id, "string");
		assert.typeOf(playlist.channel.name, "string");
		assert.typeOf(playlist.channel.url, "string");
		assert.equal(playlist.videos.length, 37);
		assert.equal(playlist.videos[0].id, "0woboOZ9dmY");
		assert.equal(playlist.videos[0].title, "Poopy-di Scoop");
		assert.equal(playlist.videos[0].duration, 17);
		assert.startsWith(playlist.videos[0].thumbnail, "https://i.ytimg.com/");
	});

	it("match getVideo result", async () => {
		const video = await scrape.getVideo(VIDEO_ID);
		assert.equal(video.id, VIDEO_ID);
		assert.equal(video.title, "Rick Astley - Never Gonna Give You Up (Video)");
		assert.typeOf(video.description, "string");
		assert.typeOf(video.channel.id, "string");
		assert.typeOf(video.channel.name, "string");
		assert.typeOf(video.channel.url, "string");
		assert.typeOf(video.uploadDate, "string");
		assert.isAbove(video.viewCount, 680000000);
		assert.isAbove(video.likeCount, 5200000);
		assert.isAbove(video.dislikeCount, 190000);
		assert.equal(video.tags.length, 3);
	});

	describe("getRelated", () => {	
		let videos;
		before(async () => {
			videos = await scrape.getRelated(VIDEO_ID, 3);
		});
		it("related videos should be 3", () => {
			assert.equal(videos.length, 3);
		});
		it("match 1st related video", () => {
			assert.lengthOf(videos[0].id, 11);
			assert.typeOf(videos[0].title, "string");
			assert.typeOf(videos[0].duration, "number");
			assert.startsWith(videos[0].thumbnail, "https://i.ytimg.com/");
			assert.typeOf(videos[0].channel.id, "string");
			assert.typeOf(videos[0].channel.name, "string");
			assert.typeOf(videos[0].channel.url, "string");
			assert.isTrue(orNull(videos[0].uploadDate, "string"));
			assert.typeOf(videos[0].viewCount, "number");
		});
	});

	it("check upNext video", async () => {
		const video = await scrape.getUpNext(VIDEO_ID);
		assert.lengthOf(video.id, 11);
		assert.typeOf(video.title, "string");
		assert.typeOf(video.duration, "number");
		assert.startsWith(video.thumbnail, "https://i.ytimg.com/");
		assert.typeOf(video.channel.id, "string");
		assert.typeOf(video.channel.name, "string");
		assert.typeOf(video.channel.url, "string");
		assert.typeOf(video.uploadDate, "string");
		assert.typeOf(video.viewCount, "number");
	});

});