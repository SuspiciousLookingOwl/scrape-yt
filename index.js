const cheerio = require("cheerio");
const request = require("request");

let url = "https://www.youtube.com/";

const searchType = {
	video: "EgIQAQ%253D%253D",
	playlist: "EgIQAw%253D%253D"
};

const getDuration = (s) => {
	s = s.replace(/:/, ".");
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


const parseSearch = (url, options) => {
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

				let id = $video.find("a.yt-uix-tile-link").attr("href").replace("/watch?v=", "");
				let uploadDate = null;
				let viewCount = null;
				let videoCount = null;
	
				if (options.type === "video") {
					uploadDate = $video.find(".yt-lockup-meta-info li:first-of-type").text();
					viewCount = +$video.find(".yt-lockup-meta-info li:last-of-type").text().replace(/[^0-9]/g, "");
				}
	
				if (options.type === "playlist") {
					id = id.split("&list=")[1];
					videoCount = +$video.find(".formatted-video-count-label b").text();
				}

				const result = {
					id: id,
					channel: {
						url: "https://www.youtube.com" + $video.find(".yt-lockup-byline a").attr("href") || null,
						name: $video.find(".yt-lockup-byline a").text() || null,
					},
					title: $video.find(".yt-lockup-title a").text(),
					duration: getDuration($video.find(".video-time").text().trim()) || null,
					thumbnail: $video.find(".yt-thumb-simple img").attr("data-thumb") || $video.find(".yt-thumb-simple img").attr("src"),
					uploadDate: uploadDate,
					viewCount: viewCount,
					videoCount: videoCount
				};

				Object.keys(result).forEach((i) => {
					if (result[i] === null) delete result[i];
				});

				if (i < options.limit) results.push(result);
				else return false;
			});
			resolve(results);

		});
	});
};


const parseGetPlaylistVideo = (url) => {
	return new Promise((resolve, reject) => {
		request({
			method: "GET",
			url: url
		}, (err, res, body) => {

			if (err != null || res.statusCode != 200) return reject("Failed to search videos");

			const $ = cheerio.load(body);
			let results = [];

			$(".pl-video").each((i, v) => {
				const $video = $(v);
				
				const result = {
					id: $video.find("button").attr("data-video-ids"),
					channel: {
						url: "https://www.youtube.com" + $video.find(".pl-video-owner a").attr("href"),
						name: $video.find(".pl-video-owner a").text()
					},
					title: $video.find("a.pl-video-title-link").text().replace(/\n/g,"").trim(),
					duration: getDuration($video.find(".timestamp").text()) || null,
					thumbnail: $video.find("img").attr("data-thumb")
				};

				if(result.duration === null) return true; //Continue of deleted video
				results.push(result);
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
	 * Search youtube for a list of  based on a search query.
	 * @param query Search Query
	 * @param options (optional) Option for search type and limit
	 */
	search: (query, options) => {
		return new Promise((resolve, reject) => {

			if (typeof options === "undefined") options = {};

			options = {
				type: "video",
				limit: 10,
				...options
			};

			let searchUrl = url + "results?";
			if (query.trim().length === 0) return reject(new Error("Query cannot be blank"));
			if (options.type && searchType[options.type]) searchUrl += "sp=" + searchType[options.type] + "&";

			resolve(parseSearch(searchUrl + "search_query=" + query.replace(/\s/g, "+"), options));
		});
	},

	/**
	 * Search youtube for videos in a playlist.
	 * @param videoId Id of the video
	 */
	getPlaylistVideo: (playlistId) => {
		return new Promise((resolve, reject) => {
			let playlistUrl = url + "playlist?";
			if (playlistId.trim().length === 0) return reject(new Error("Playlist ID cannot be blank"));
			resolve(parseGetPlaylistVideo(playlistUrl + "list=" + playlistId));
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