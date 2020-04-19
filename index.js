const cheerio = require("cheerio");
const request = require("request");

let url = "https://www.youtube.com/";


const getDuration = (s) => {
	const spl = s.split(".");
	if (spl.length === 0) return +spl;
	else {
		let sum = +spl.pop();
		if (spl.length === 1) sum += +spl[0] * 60;
		if (spl.length === 2) {
			sum += +spl[1] * 60;
			sum += +spl[0] * 3600;
		}
		return sum;
	}
};


const parseSearch = (url, limit) => {
	return new Promise((resolve, reject) => {
		request({
			method: "GET",
			url: url
		}, (err, res, body) => {

			if (err != null || res.statusCode != 200) return reject("Failed to search videos");

			let results = [];
			const $ = cheerio.load(body);

			$(".yt-lockup").each((i, v) => {
				const $video = $(v);
				const result = {
					id: $video.find("a.yt-uix-tile-link").attr("href").replace("/watch?v=", ""),
					channel: {
						url: "https://www.youtube.com" + $video.find(".yt-lockup-byline a").attr("href") || null,
						name: $video.find(".yt-lockup-byline a").text() || null,
					},
					title: $video.find(".yt-lockup-title a").text(),
					duration: getDuration($video.find(".video-time").text().trim()) || null,
					thumbnail: $video.find(".yt-thumb-simple img").attr("data-thumb") || $video.find(".yt-thumb-simple img").attr("src"),
					uploadDate: $video.find(".yt-lockup-meta-info li:first-of-type").text(),
					viewCount: +$video.find(".yt-lockup-meta-info li:last-of-type").text().replace(/[^0-9]/g, "")
				};
				if (i < limit) results.push(result);
			});
			resolve(results);

		});
	});
};


const parseGetVideo = (url) => {
	return new Promise((resolve, reject) => {
		request({
			method: "GET",
			url: url
		}, (err, res, body) => {

			if (err != null || res.statusCode != 200 || typeof body.split("RELATED_PLAYER_ARGS': ")[1] === "undefined") return reject("Failed to get video");

			let relatedPlayer = body.split("RELATED_PLAYER_ARGS': ")[1].split("'BG_P'")[0].split("\n")[0];
			let videoInfo = JSON.parse(JSON.parse(relatedPlayer.substring(0, relatedPlayer.length - 1)).watch_next_response).contents.twoColumnWatchNextResults.results.results.contents[0].itemSectionRenderer.contents[0].videoMetadataRenderer;

			let tags = [];
			let description = "";

			if (typeof videoInfo.topStandaloneBadge !== "undefined") {
				videoInfo.topStandaloneBadge.standaloneCollectionBadgeRenderer.label.runs.forEach(tag => {
					if (tag.text.trim()) tags.push(tag.text);
				});
			}

			videoInfo.description.runs.forEach(descriptionPart => {
				description += descriptionPart.text;
			});

			const video = {
				id: videoInfo.videoId,
				channel: {
					id: videoInfo.owner.videoOwnerRenderer.title.runs[0].navigationEndpoint.browseEndpoint.browseId,
					name: videoInfo.owner.videoOwnerRenderer.title.runs[0].text,
					thumbnail: "https:" + videoInfo.owner.videoOwnerRenderer.thumbnail.thumbnails[videoInfo.owner.videoOwnerRenderer.thumbnail.thumbnails.length - 1].url
				},
				title: videoInfo.title.runs[0].text,
				description: description,
				uploadDate: videoInfo.dateText.simpleText,
				viewCount: +videoInfo.viewCount.videoViewCountRenderer.viewCount.simpleText.replace(/[^0-9]/g, ""),
				likeCount: videoInfo.likeButton.likeButtonRenderer.likeCount,
				dislikeCount: videoInfo.likeButton.likeButtonRenderer.dislikeCount,
				tags: tags
			};

			resolve(video);

		});
	});
};


const parseGetRelated = (url, limit) => {
	return new Promise((resolve, reject) => {
		request({
			method: "GET",
			url: url
		}, (err, res, body) => {

			if (err != null || res.statusCode != 200 || typeof body.split("RELATED_PLAYER_ARGS': ")[1] === "undefined") return reject("Failed to get related videos");

			let relatedPlayer = body.split("RELATED_PLAYER_ARGS': ")[1].split("'BG_P'")[0].split("\n")[0];
			let videosInfo = JSON.parse(JSON.parse(relatedPlayer.substring(0, relatedPlayer.length - 1)).watch_next_response).contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results;

			let relatedVideos = [];

			for (var i = 0; i < videosInfo.length; i++) {

				const videoInfo = videosInfo[i].compactVideoRenderer;
				if (typeof videoInfo === "undefined" || typeof videoInfo.publishedTimeText === "undefined") continue;

				const video = {
					id: videoInfo.videoId,
					channel: {
						id: videoInfo.longBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
						name: videoInfo.longBylineText.runs[0].text
					},
					title: videoInfo.title.simpleText,
					duration: getDuration(videoInfo.lengthText.simpleText),
					thumbnail: videoInfo.thumbnail.thumbnails[videoInfo.thumbnail.thumbnails.length - 1].url,
					uploadDate: videoInfo.publishedTimeText.simpleText,
					viewCount: +videoInfo.viewCountText.simpleText.replace(/[^0-9]/g, ""),
				};

				if (relatedVideos.length < limit) relatedVideos.push(video);
				else break;
			}

			resolve(relatedVideos);

		});
	});
};


const parseGetUpNext = (url) => {
	return new Promise((resolve, reject) => {
		request({
			method: "GET",
			url: url
		}, (err, res, body) => {

			if (err != null || res.statusCode != 200 || typeof body.split("RELATED_PLAYER_ARGS': ")[1] === "undefined") return reject("Failed to get up next video");

			let relatedPlayer = body.split("RELATED_PLAYER_ARGS': ")[1].split("'BG_P'")[0].split("\n")[0];
			let videoInfo = JSON.parse(JSON.parse(relatedPlayer.substring(0, relatedPlayer.length - 1)).watch_next_response).contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results[0].compactAutoplayRenderer.contents[0].compactVideoRenderer;

			let upNext = {
				id: videoInfo.videoId,
				channel: {
					id: videoInfo.longBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
					name: videoInfo.longBylineText.runs[0].text
				},
				title: videoInfo.title.simpleText,
				duration: getDuration(videoInfo.lengthText.simpleText),
				thumbnail: videoInfo.thumbnail.thumbnails[videoInfo.thumbnail.thumbnails.length - 1].url,
				uploadDate: videoInfo.publishedTimeText ? videoInfo.publishedTimeText.simpleText : "",
				viewCount: +videoInfo.viewCountText.simpleText.replace(/[^0-9]/g, ""),
			};

			resolve(upNext);

		});

	});
};


module.exports = {
	/**
	 * Search youtube for a list of videos based on a search query.
	 * @param query Search Query
	 * @param limit (optional) Max videos count
	 */
	search: (query, limit = 10) => {
		return new Promise((resolve, reject) => {
			let searchUrl = url + "results?";
			if (query.trim().length === 0) return reject(new Error("Query cannot be blank"));
			searchUrl += "sp=EgIQAQ%253D%253D&";
			resolve(parseSearch(searchUrl + "search_query=" + query.replace(/\s/g, "+"), limit));
		});
	},

	/**
	 * Search youtube for video information.
	 * @param videoId Id of the video
	 */
	getVideo: (videoId) => {
		return new Promise((resolve, reject) => {
			let videoUrl = url + "watch?";
			if (videoId.trim().length === 0) return reject(new Error("Video ID cannot be blank"));
			resolve(parseGetVideo(videoUrl + "v=" + videoId));
		});
	},

	/**
	 * Search youtube for related videos based on videoId .
	 * @param videoId Id of the video
	 * @param limit (optional) Max videos count
	 */
	getRelated: (videoId, limit = 10) => {
		return new Promise((resolve, reject) => {
			let videoUrl = url + "watch?";
			if (videoId.trim().length === 0) return reject(new Error("Video ID cannot be blank"));
			resolve(parseGetRelated(videoUrl + "v=" + videoId, limit));
		});
	},

	/**
	 * Search youtube for up next video based on videoId.
	 * @param videoId Id of the video
	 */
	getUpNext: (videoId) => {
		return new Promise((resolve, reject) => {
			let videoUrl = url + "watch?";
			if (videoId.trim().length === 0) return reject(new Error("Video ID cannot be blank"));
			resolve(parseGetUpNext(videoUrl + "v=" + videoId));
		});
	}

};