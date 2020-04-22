const cheerio = require("cheerio");
const request = require("request");

let url = "https://www.youtube.com/";


const searchType = {
	video: "EgIQAQ%253D%253D",
	playlist: "EgIQAw%253D%253D",
	channel: "EgIQAg%253D%253D"
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

			if (err != null || res.statusCode != 200) return reject(new Error("Failed to search"));

			let results = [];
			const $ = cheerio.load(body);
			
			$(".yt-lockup").each((i, v) => {
				const $result = $(v);

				let id = $result.find("a.yt-uix-tile-link").attr("href");
				let video = {};
				let playlist = {};
				let channel = {};

				if (id.startsWith("https://www.googleadservices.com")) return true; //Ignoring ad

				if (options.type === "video") {
					id = id.replace("/watch?v=", "");
					video = {
						title: $result.find(".yt-lockup-title a").text(),
						duration: getDuration($result.find(".video-time").text().trim()) || null,
						thumbnail: $result.find(".yt-thumb-simple img").attr("data-thumb") || $result.find(".yt-thumb-simple img").attr("src"),
						channel: {
							id: $result.find(".yt-lockup-byline a").attr("href").split("/")[2],
							name: $result.find(".yt-lockup-byline a").text() || null,
							url: "https://www.youtube.com" + $result.find(".yt-lockup-byline a").attr("href") || null,
						},
						uploadDate: $result.find(".yt-lockup-meta-info li:first-of-type").text(),
						viewCount: +$result.find(".yt-lockup-meta-info li:last-of-type").text().replace(/[^0-9]/g, "")
					};
				} else if (options.type === "playlist") {
					id = id.split("&list=")[1];
					playlist = {
						title: $result.find(".yt-lockup-title a").text(),
						thumbnail: $result.find(".yt-thumb-simple img").attr("data-thumb") || $result.find(".yt-thumb-simple img").attr("src"),
						channel: {
							id: $result.find(".yt-lockup-byline a").attr("href").split("/")[2],
							name: $result.find(".yt-lockup-byline a").text() || null,
							url: "https://www.youtube.com" + $result.find(".yt-lockup-byline a").attr("href") || null,
						},
						videoCount: +$result.find(".formatted-video-count-label b").text().replace(/[^0-9]/g, "")
					};
				} else if (options.type === "channel") {
					id = id.split("/")[2];
					channel = {
						name: $result.find(".yt-lockup-title a").text(),
						thumbnail: `https:${$result.find(".yt-thumb-simple img").attr("data-thumb") || $result.find(".yt-thumb-simple img").attr("src")}`,
						videoCount: +$result.find(".yt-lockup-meta-info li").text().replace(/[^0-9]/g, ""),
						url: "https://www.youtube.com" + $result.find("a.yt-uix-tile-link").attr("href")
					};
				}

				const result = {
					id: id,
					...options.type === "video" && {...video},
					...options.type === "playlist" && {...playlist},
					...options.type === "channel" && {...channel}
				};

				Object.keys(result).forEach((i) => {
					if (result[i] === null) delete result[i];
				});

				if (results.length < options.limit) results.push(result);
				else return false;
			});

			//In rare cases, the data is not present on the dom, instead it's still on the script
			if (results.length == 0) {

				var dataInfo = [];
				var scraped = false;

				// Try to decode the data if it's still encoded
				try {
					let data = body.split("ytInitialData = JSON.parse('")[1].split("');</script>")[0];
					data = data.replace(/\\x([0-9A-F]{2})/ig, function() {
						return String.fromCharCode(parseInt(arguments[1], 16));
					});
					body = data;
					scraped = true;
				} catch(err) {}

				//Trying to scrap for each possible ways of how Youtube serve the data in JS ordered by most common possibility
				try {
					dataInfo = JSON.parse(body.split("{\"itemSectionRenderer\":{\"contents\":")[2].split(",\"continuations\":[{")[0]);
					scraped = true;
				} catch(err) {}
				if (!scraped) {
					try {
						dataInfo = JSON.parse(body.split("{\"itemSectionRenderer\":")[2].split("},{\"continuationItemRenderer\":{")[0]).contents;
						scraped = true;
					} catch(err) {}
				}
				if (!scraped) {
					try {
						dataInfo = JSON.parse(body.split("{\"itemSectionRenderer\":{\"contents\":")[1].split(",\"continuations\":[{")[0]);
						dataInfo.shift();
						scraped = true;
					} catch(err) {}
				}

				for (var i = 0; i < dataInfo.length; i++) {
					let data = dataInfo[i];
					let result = {};

					if (options.type === "video") {
						data = data.videoRenderer;
						result = {
							id: data.videoId,
							title: data.title.runs[0].text,
							duration: getDuration(data.lengthText.simpleText) || null,
							thumbnail: data.thumbnail.thumbnails[data.thumbnail.thumbnails.length - 1],
							channel: {
								id: data.ownerText.runs[0].navigationEndpoint.browseEndpoint.browseId,
								name: data.ownerText.runs[0].text || null,
								url: "https://www.youtube.com" + data.ownerText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl || null,
							},
							uploadDate: typeof data.publishedTimeText !== "undefined" ? data.publishedTimeText.simpleText : "",
							viewCount: +data.viewCountText.simpleText.replace(/[^0-9]/g, "")
						};
					} else if (options.type === "playlist") {
						data = data.playlistRenderer;
						result = {
							id: data.playlistId,
							title: data.title.simpleText,
							thumbnail: data.thumbnails[0].thumbnails[data.thumbnails[0].thumbnails.length-1],
							channel: {
								id: data.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
								name: data.shortBylineText.runs[0].text,
								url: "https://www.youtube.com" + data.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url,
							},
							videoCount: +data.videoCount.replace(/[^0-9]/g, ""),
						};
					} else if (options.type === "channel") {
						data = data.channelRenderer;
						result = {
							id: data.channelId,
							name: data.title.simpleText,
							thumbnail: `https:${data.thumbnail.thumbnails[data.thumbnail.thumbnails.length-1]}`,
							videoCount: +data.videoCountText.runs[0].text.replace(/[^0-9]/g, ""),
							url: "https://www.youtube.com" + data.navigationEndpoint.browseEndpoint.canonicalBaseUrl
						};
					}
	
					Object.keys(result).forEach((i) => {
						if (result[i] === null) delete result[i];
					});
	
					if (results.length < options.limit) results.push(result);
					else break;
				}
			}
			resolve(results);

		});
	});
};


const parseGetPlaylist = (url) => {
	return new Promise((resolve, reject) => {
		request({
			method: "GET",
			url: url
		}, (err, res, body) => {

			if (err != null || res.statusCode != 200) return reject(new Error("Failed to get playlist"));

			const $ = cheerio.load(body);
			let videos = [];

			$(".pl-video").each((i, v) => {
				const $result = $(v);
				
				const video = {
					id: $result.find("button").attr("data-video-ids"),
					title: $result.find("a.pl-video-title-link").text().replace(/\n/g,"").trim(),
					duration: getDuration($result.find(".timestamp").text()) || null,
					thumbnail: $result.find("img").attr("data-thumb"),
					channel: {
						id: $result.find(".pl-video-owner a").attr("href").split("/")[2],
						name: $result.find(".pl-video-owner a").text(),
						url: "https://www.youtube.com" + $result.find(".pl-video-owner a").attr("href")
					}
				};

				if(video.duration === null) return true; //Continue of deleted video
				videos.push(video);
			});

			const playlist = {
				id: $("#pl-header").attr("data-full-list-id"),
				title: $(".pl-header-title").text().trim(),
				videoCount: +$(".pl-header-details li")[$(".pl-header-details li").length-3].children[0].data.replace(/[^0-9]/g, ""),
				viewCount: +$(".pl-header-details li")[$(".pl-header-details li").length-2].children[0].data.replace(/[^0-9]/g, ""),
				lastUpdatedAt: $(".pl-header-details li")[$(".pl-header-details li").length-1].children[0].data,
				... typeof $("#appbar-nav a").attr("href") != "undefined" && {
					channel: {
						id: $("#appbar-nav a").attr("href").split("/")[2],
						name: $(".appbar-nav-avatar").attr("title"),
						thumbnail: $(".appbar-nav-avatar").attr("src"),
						url: "https://www.youtube.com" + $("#appbar-nav a").attr("href")
					}
				},
				videos: videos
			};

			resolve(playlist);

		});
	});
};


const parseGetVideo = (url) => {
	return new Promise((resolve, reject) => {
		request({
			method: "GET",
			url: url
		}, (err, res, body) => {

			if (err != null || res.statusCode != 200 || typeof body.split("RELATED_PLAYER_ARGS': ")[1] === "undefined") return reject(new Error("Failed to get video"));

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
				title: videoInfo.title.runs[0].text,
				description: description,
				channel: {
					id: videoInfo.owner.videoOwnerRenderer.title.runs[0].navigationEndpoint.browseEndpoint.browseId,
					name: videoInfo.owner.videoOwnerRenderer.title.runs[0].text,
					thumbnail: "https:" + videoInfo.owner.videoOwnerRenderer.thumbnail.thumbnails[videoInfo.owner.videoOwnerRenderer.thumbnail.thumbnails.length - 1].url,
					url: "https://www.youtube.com/channel/" + videoInfo.owner.videoOwnerRenderer.title.runs[0].navigationEndpoint.browseEndpoint.browseId
				},
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

			if (err != null || res.statusCode != 200 || typeof body.split("RELATED_PLAYER_ARGS': ")[1] === "undefined") return reject(new Error("Failed to get related videos"));

			let relatedPlayer = body.split("RELATED_PLAYER_ARGS': ")[1].split("'BG_P'")[0].split("\n")[0];
			let videosInfo = JSON.parse(JSON.parse(relatedPlayer.substring(0, relatedPlayer.length - 1)).watch_next_response).contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results;

			let relatedVideos = [];

			for (var i = 0; i < videosInfo.length; i++) {

				const videoInfo = videosInfo[i].compactVideoRenderer;
				if (typeof videoInfo === "undefined" || 
					typeof videoInfo.publishedTimeText === "undefined" ||
					typeof videoInfo.viewCountText === "undefined"
				) continue;

				const video = {
					id: videoInfo.videoId,
					title: videoInfo.title.simpleText,
					duration: getDuration(videoInfo.lengthText.simpleText),
					thumbnail: videoInfo.thumbnail.thumbnails[videoInfo.thumbnail.thumbnails.length - 1].url,
					channel: {
						id: videoInfo.longBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
						name: videoInfo.longBylineText.runs[0].text,
						url: "https://www.youtube.com/channel/" + videoInfo.longBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId
					},
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

			if (err != null || res.statusCode != 200 || typeof body.split("RELATED_PLAYER_ARGS': ")[1] === "undefined") return reject(new Error("Failed to get up next video"));

			let relatedPlayer = body.split("RELATED_PLAYER_ARGS': ")[1].split("'BG_P'")[0].split("\n")[0];
			let videoInfo = JSON.parse(JSON.parse(relatedPlayer.substring(0, relatedPlayer.length - 1)).watch_next_response).contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results[0].compactAutoplayRenderer.contents[0].compactVideoRenderer;

			let upNext = {
				id: videoInfo.videoId,
				channel: {
					id: videoInfo.longBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
					name: videoInfo.longBylineText.runs[0].text,
					url: "https://www.youtube.com/channel/" + videoInfo.longBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId
				},
				title: videoInfo.title.simpleText,
				duration: getDuration(videoInfo.lengthText.simpleText),
				thumbnail: videoInfo.thumbnail.thumbnails[videoInfo.thumbnail.thumbnails.length - 1].url,
				uploadDate: videoInfo.publishedTimeText ? videoInfo.publishedTimeText.simpleText : "",
				viewCount: typeof videoInfo.viewCountText !== "undefined" ? +videoInfo.viewCountText.simpleText.replace(/[^0-9]/g, "") : 0,
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
				page: 1,
				...options
			};

			let searchUrl = url + "results?";
			if (query.trim().length === 0) return reject(new Error("Query cannot be blank"));
			if (options.type && searchType[options.type]) searchUrl += "sp=" + searchType[options.type] + "&";
			else searchUrl += "sp=" + searchType["video"] + "&"; //Default type will be video
			searchUrl += "page=" + options.page + "&"

			resolve(parseSearch(searchUrl + "search_query=" + query.replace(/\s/g, "+"), options));
		});
	},

	/**
	 * Search youtube for playlist information.
	 * @param videoId Id of the video
	 */
	getPlaylist: (playlistId) => {
		return new Promise((resolve, reject) => {
			let playlistUrl = url + "playlist?";
			if (playlistId.trim().length === 0) return reject(new Error("Playlist ID cannot be blank"));
			resolve(parseGetPlaylist(playlistUrl + "list=" + playlistId));
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