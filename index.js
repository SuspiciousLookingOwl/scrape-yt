/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */

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

				if (typeof id === "undefined" || id.startsWith("https://www.googleadservices.com")) return true; //Ignoring non video

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
				var scrapped = false;

				// Try to decode the data if it's still encoded
				try {
					let data = body.split("ytInitialData = JSON.parse('")[1].split("');</script>")[0];
					data = data.replace(/\\x([0-9A-F]{2})/ig, function() {
						return String.fromCharCode(parseInt(arguments[1], 16));
					});
					body = data;
				} catch(err) {} 

				//Trying to scrap for each possible ways of how Youtube serve the data in JS ordered by most common possibility
				try {
					dataInfo = JSON.parse(body.split("{\"itemSectionRenderer\":{\"contents\":")[body.split("{\"itemSectionRenderer\":{\"contents\":").length - 1].split(",\"continuations\":[{")[0]);
					scrapped = true;
				} catch(err) {}
				if (!scrapped) {
					try {
						dataInfo = JSON.parse(body.split("{\"itemSectionRenderer\":")[body.split("{\"itemSectionRenderer\":").length - 1].split("},{\"continuationItemRenderer\":{")[0]).contents;
						scrapped = true;
					} catch(err) {}
				}

				for (var i = 0; i < dataInfo.length; i++) {
					let data = dataInfo[i];
					let result = {};
					
					if (options.type === "video") {
						data = data.videoRenderer;
						if(typeof data === "undefined") continue; 
						result = {
							id: data.videoId,
							title: data.title.runs[0].text,
							duration: typeof data.lengthText !== "undefined" ? getDuration(data.lengthText.simpleText) : null,
							thumbnail: data.thumbnail.thumbnails[data.thumbnail.thumbnails.length - 1].url,
							channel: {
								id: data.ownerText.runs[0].navigationEndpoint.browseEndpoint.browseId,
								name: data.ownerText.runs[0].text || null,
								url: "https://www.youtube.com" + data.ownerText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl || null,
							},
							uploadDate: typeof data.publishedTimeText !== "undefined" ? data.publishedTimeText.simpleText : null,
							viewCount: typeof data.viewCountText.simpleText !== "undefined" ? +data.viewCountText.simpleText.replace(/[^0-9]/g, "") : null
						};
					} else if (options.type === "playlist") {
						data = data.playlistRenderer;
						if(typeof data === "undefined") continue;
						result = {
							id: data.playlistId,
							title: data.title.simpleText,
							thumbnail: data.thumbnails[0].thumbnails[data.thumbnails[0].thumbnails.length-1].url,
							channel: {
								id: data.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
								name: data.shortBylineText.runs[0].text,
								url: "https://www.youtube.com" + data.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url,
							},
							videoCount: +data.videoCount.replace(/[^0-9]/g, ""),
						};
					} else if (options.type === "channel") {
						data = data.channelRenderer;
						if(typeof data === "undefined") continue;
						result = {
							id: data.channelId,
							name: data.title.simpleText,
							thumbnail: `https:${data.thumbnail.thumbnails[data.thumbnail.thumbnails.length-1].url}`,
							videoCount: typeof data.videoCountText !== "undefined" ? +data.videoCountText.runs[0].text.replace(/[^0-9]/g, "") : null,
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

			let playlist = {};
			let videos = [];

			$(".pl-video").each((i, v) => {
				const $result = $(v);
				
				if(typeof $result.find(".pl-video-owner a").attr("href") === "undefined") return true; //Continue if deleted video

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

				videos.push(video);
			});

			if (videos.length == 0) {
				try {
					var playlistVideoList = JSON.parse(body.split("{\"playlistVideoListRenderer\":{\"contents\":")[1].split("}],\"playlistId\"")[0]+"}]");
				} catch (err) { // Playlist not found
					return resolve({});
				}

				for (var i = 0; i < playlistVideoList.length; i++) {

					let videoInfo = playlistVideoList[i].playlistVideoRenderer;
					if(typeof videoInfo.shortBylineText === "undefined") continue; //Continue if deleted video

					const video = {
						id: videoInfo.videoId,
						title: videoInfo.title.simpleText,
						duration: getDuration(videoInfo.lengthText.simpleText),
						thumbnail: videoInfo.thumbnail.thumbnails[videoInfo.thumbnail.thumbnails.length-1].url,
						channel: {
							id: videoInfo.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
							name: videoInfo.shortBylineText.runs[0].text,
							url: "https://www.youtube.com" + videoInfo.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url
						}
					};
	
					videos.push(video);
				}

				
				let sidebarRenderer = JSON.parse(body.split("{\"playlistSidebarRenderer\":")[1].split("\n")[0].slice(0, -3)).items;

				let primaryRenderer = sidebarRenderer[0].playlistSidebarPrimaryInfoRenderer;
				let videoOwner = sidebarRenderer[1].playlistSidebarSecondaryInfoRenderer.videoOwner;

				playlist = {
					id: primaryRenderer.title.runs[0].navigationEndpoint.watchEndpoint.playlistId,
					title: primaryRenderer.title.runs[0].text,
					videoCount: +primaryRenderer.stats[primaryRenderer.stats.length-3].runs[0].text.replace(/[^0-9]/g, ""),
					viewCount: +primaryRenderer.stats[primaryRenderer.stats.length-2].simpleText.replace(/[^0-9]/g, ""),
					lastUpdatedAt: primaryRenderer.stats[primaryRenderer.stats.length-1].simpleText,
					... typeof videoOwner !== "undefined" && {
						channel: {
							id: videoOwner.videoOwnerRenderer.title.runs[0].navigationEndpoint.browseEndpoint.browseId,
							name: videoOwner.videoOwnerRenderer.title.runs[0].text,
							thumbnail: videoOwner.videoOwnerRenderer.thumbnail.thumbnails[videoOwner.videoOwnerRenderer.thumbnail.thumbnails.length-1].url,
							url: "https://www.youtube.com" + videoOwner.videoOwnerRenderer.title.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url
						}
					},
					videos: videos
				};
				
			} else {
				playlist = {
					id: $("#pl-header").attr("data-full-list-id"),
					title: $(".pl-header-title").text().trim(),
					videoCount: +$(".pl-header-details li")[$(".pl-header-details li").length-3].children[0].data.replace(/[^0-9]/g, ""),
					viewCount: +$(".pl-header-details li")[$(".pl-header-details li").length-2].children[0].data.replace(/[^0-9]/g, ""),
					lastUpdatedAt: $(".pl-header-details li")[$(".pl-header-details li").length-1].children[0].data,
					... typeof $("#appbar-nav a").attr("href") !== "undefined" && {
						channel: {
							id: $("#appbar-nav a").attr("href").split("/")[2],
							name: $(".appbar-nav-avatar").attr("title"),
							thumbnail: $(".appbar-nav-avatar").attr("src"),
							url: "https://www.youtube.com" + $("#appbar-nav a").attr("href")
						}
					},
					videos: videos
				};
			} 
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

			if (err != null || res.statusCode != 200) return reject(new Error("Failed to get video"));

			try {
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
					likeCount: videoInfo.likeButton.likeButtonRenderer.likeCount || 0,
					dislikeCount: videoInfo.likeButton.likeButtonRenderer.dislikeCount || 0,
					tags: tags
				};
	
				return resolve(video);
			} catch (err) { // Alternative
				let contents = JSON.parse(body.split("window[\"ytInitialData\"] = ")[1].split(";\n")[0]).contents.twoColumnWatchNextResults.results.results.contents;

				let secondaryInfo = contents[1].videoSecondaryInfoRenderer;
				let primaryInfo = contents[0].videoPrimaryInfoRenderer;
				let videoInfo = {...secondaryInfo, ...primaryInfo};

				let tags = [];
				let description = "";

				if (typeof videoInfo.superTitleLink !== "undefined") {
					videoInfo.superTitleLink.runs.forEach(tag => {
						if (tag.text.trim()) tags.push(tag.text);
					});
				}

				videoInfo.description.runs.forEach(descriptionPart => {
					description += descriptionPart.text;
				});

				const video = {
					id: videoInfo.videoActions.menuRenderer.topLevelButtons[3].buttonRenderer.navigationEndpoint.modalEndpoint.modal.modalWithTitleAndButtonRenderer.button.buttonRenderer.navigationEndpoint.signInEndpoint.nextEndpoint.watchEndpoint.videoId,
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
					likeCount: videoInfo.videoActions.menuRenderer.topLevelButtons[0].toggleButtonRenderer.defaultText.accessibility ? +videoInfo.videoActions.menuRenderer.topLevelButtons[0].toggleButtonRenderer.defaultText.accessibility.accessibilityData.label.replace(/[^0-9]/g, "") : null,
					dislikeCount: videoInfo.videoActions.menuRenderer.topLevelButtons[1].toggleButtonRenderer.defaultText.accessibility ? +videoInfo.videoActions.menuRenderer.topLevelButtons[1].toggleButtonRenderer.defaultText.accessibility.accessibilityData.label.replace(/[^0-9]/g, "") : null,
					tags: tags
				};
	
				return resolve(video);


			}
		});
	});
};


const parseGetRelated = (url, limit) => {
	return new Promise((resolve, reject) => {
		request({
			method: "GET",
			url: url
		}, (err, res, body) => {

			if (err != null || res.statusCode != 200 ) return reject(new Error("Failed to get related videos"));

			let videosInfo = [];
			let scrapped = false;

			try {
				let relatedPlayer = body.split("RELATED_PLAYER_ARGS': ")[1].split("'BG_P'")[0].split("\n")[0];
				videosInfo = JSON.parse(JSON.parse(relatedPlayer.substring(0, relatedPlayer.length - 1)).watch_next_response).contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results;
				scrapped = true;
			} catch (err) {}

			if(!scrapped){
				try {
					videosInfo = JSON.parse(body.split("{\"secondaryResults\":{\"results\":")[1].split(",\"continuations\":[{")[0]);
					scrapped = true;
				} catch (err) {}
			}

			if(!scrapped){
				try {
					videosInfo = JSON.parse(body.split("secondaryResults\":{\"secondaryResults\":")[1].split("},\"autoplay\":{\"autoplay\":{")[0]).results;
					scrapped = true;
				} catch (err) {}
			}

			let relatedVideos = [];

			for (var i = 0; i < videosInfo.length; i++) {

				const videoInfo = videosInfo[i].compactVideoRenderer;
				if (typeof videoInfo === "undefined" || typeof videoInfo.viewCountText === "undefined") continue;

				const video = {
					id: videoInfo.videoId,
					title: videoInfo.title.simpleText,
					duration: typeof videoInfo.lengthText !== "undefined" ? getDuration(videoInfo.lengthText.simpleText) : null,
					thumbnail: videoInfo.thumbnail.thumbnails[videoInfo.thumbnail.thumbnails.length - 1].url,
					channel: {
						id: videoInfo.longBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
						name: videoInfo.longBylineText.runs[0].text,
						url: "https://www.youtube.com/channel/" + videoInfo.longBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId
					},
					uploadDate: typeof videoInfo.publishedTimeText !== "undefined" ? videoInfo.publishedTimeText.simpleText : null,
					viewCount: typeof videoInfo.viewCountText.simpleText !== "undefined" ? +videoInfo.viewCountText.simpleText.replace(/[^0-9]/g, "") : +videoInfo.viewCountText.runs[0].text.replace(/[^0-9]/g, ""),
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

			if (err != null || res.statusCode != 200) return reject(new Error("Failed to get up next video"));

			let videoInfo = null;
			let scrapped = false;
			
			try {
				let relatedPlayer = body.split("RELATED_PLAYER_ARGS': ")[1].split("'BG_P'")[0].split("\n")[0];
				videoInfo = JSON.parse(JSON.parse(relatedPlayer.substring(0, relatedPlayer.length - 1)).watch_next_response).contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results[0].compactAutoplayRenderer.contents[0].compactVideoRenderer;
				scrapped = true;
			} catch (err) {}

			if(!scrapped){
				try {
					videoInfo = JSON.parse(body.split("{\"secondaryResults\":{\"results\":")[1].split(",\"continuations\":[{")[0])[0].compactAutoplayRenderer.contents[0].compactVideoRenderer;
					scrapped = true;
				} catch (err) {}
			}

			if(!scrapped){
				try {
					videoInfo = JSON.parse(body.split("secondaryResults\":{\"secondaryResults\":")[1].split("},\"autoplay\":{\"autoplay\":{")[0]).results[0].compactAutoplayRenderer.contents[0].compactVideoRenderer;
					scrapped = true;
				} catch (err) {}
			}

			if (videoInfo === null) return resolve({}); // Video not found

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
				uploadDate: videoInfo.publishedTimeText ? videoInfo.publishedTimeText.simpleText : null,
				viewCount: typeof videoInfo.viewCountText !== "undefined" ? +videoInfo.viewCountText.simpleText.replace(/[^0-9]/g, "") : null,
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
			searchUrl += "page=" + options.page + "&";

			resolve(parseSearch(searchUrl + "search_query=" + encodeURIComponent(query), options));
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