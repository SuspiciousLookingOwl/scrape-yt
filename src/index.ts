import ps from "./common/parser";
import bent from "bent";
import {
	Video,
	VideoDetailed,
	Playlist,
	PlaylistDetailed,
	Channel,
	Options,
	SearchOptions,
	GetRelatedOptions,
} from "./common/types";
import { Worker } from "worker_threads";

const request = bent("string");
const url = "https://www.youtube.com/";
const searchType = {
	video: "EgIQAQ%3D%3D",
	playlist: "EgIQAw%3D%253D",
	channel: "EgIQAg%3D%253D",
};

export * from "./common/types";


/**
 * Start worker for scrapping
 * 
 * @param scraper What to scrape
 * @param html the HTML string
 * @param options Scrape options
 */
const scrapeWorker = (scraper: string, html: string, options: Options|SearchOptions|GetRelatedOptions): Promise<any> => {
	return new Promise(function(resolve, reject) {
		const worker = new Worker(__dirname + "/common/worker.js", {
			workerData: {
				scraper: scraper,
				html: html,
				options: options
			}
		});

		worker.on("message", resolve);
		worker.on("error", reject);
	});
};


/**
 * Search youtube for a list of  based on a search query.
 * 
 * @param query Search Query
 * @param options Options for scraper
 */
export const search = async (query: string, options: SearchOptions={}): Promise<(Video|Channel|Playlist)[]> => {
	if (query.trim().length === 0) throw(new Error("Query cannot be blank"));

	if (options === undefined) options = {};
	options = {
		type: "all",
		useWorkerThread: false, 
		limit: 10,
		page: 1,
		...options
	};

	let searchUrl = url + "results?";
	if (options.type && options.type !== "all") {
		searchUrl += `sp=${searchType[options.type]}&`;
	}
	
	searchUrl += `page=${options.page}&search_query=${query}`;
		
	const html = await request(searchUrl);
	
	if (options.useWorkerThread) {
		return await scrapeWorker("search", html, options);
	} else {
		return ps.parseSearch(html, options);
	}
};

/**
 * Search youtube for playlist information.
 * 
 * @param playlistId Id of the playlist
 * @param options Options for scraper
 */
export const getPlaylist = async (playlistId: string, options: Options={}): Promise<PlaylistDetailed|{}> => {
	if (playlistId.trim().length === 0) throw (new Error("Playlist ID cannot be blank"));

	if (options === undefined) options = {};
	options = {
		useWorkerThread: false, 
		...options
	};

	const playlistUrl = `${url}playlist?list=${playlistId}`;
	let html = "";

	try {
		html = await request(playlistUrl);
	} catch(err) {
		// Youtube returns 303 if playlist id not found
		if (err.statusCode === 303) return [];
		throw(err);
	}

	if (options.useWorkerThread) {
		return await scrapeWorker("getPlaylist", html, options);
	} else {
		return ps.parseGetPlaylist(html);
	}

};

/**
 * Search youtube for video information.
 * 
 * @param videoId Id of the video
 * @param options Options for scraper
 */
export const getVideo = async (videoId: string, options: Options={}): Promise<VideoDetailed|{}> => {
	if (videoId.trim().length === 0) throw(new Error("Video ID cannot be blank"));

	if (options === undefined) options = {};
	options = {
		useWorkerThread: false, 
		...options
	};

	const videoUrl = `${url}watch?v=${videoId}`;
	let html = "";

	try {
		html = await request(videoUrl);
	} catch(err) {
		// Youtube returns 303 if video id not found
		if (err.statusCode === 303) return {};
		throw(err);
	}

	if (options.useWorkerThread) {
		return await scrapeWorker("getVideo", html, options);
	} else {
		return ps.parseGetVideo(html);
	}
};

/**
 * Search youtube for related videos based on videoId.
 * 
 * @param videoId Id of the video
 * @param options Options for scraper
 */
export const getRelated = async (videoId: string, options: GetRelatedOptions={}): Promise<Video[]> => {
	if (videoId.trim().length === 0) throw(new Error("Video ID cannot be blank"));

	if (options === undefined) options = {};
	options = {
		useWorkerThread: false,
		limit: 10,
		...options
	};

	const videoUrl = `${url}watch?v=${videoId}`;

	let html = "";
	try {
		html = await request(videoUrl);
	} catch(err) {
		// Youtube returns 303 if video id not found
		if (err.statusCode === 303) return [];
		throw(err);
	}

	if (options.useWorkerThread) {
		return await scrapeWorker("getRelated", html, options);
	} else {
		return ps.parseGetRelated(html, options.limit || 10);
	}
};

/**
 * Search youtube for up next video based on videoId.
 * 
 * @param videoId Id of the video
 * @param options Options for scraper
 */
export const getUpNext = async (videoId: string, options: Options={}): Promise<Video|{}> => {
	if (videoId.trim().length === 0) throw(new Error("Video ID cannot be blank"));

	if (options === undefined) options = {};
	options = {
		useWorkerThread: false, 
		...options
	};

	const videoUrl = `${url}watch?v=${videoId}`;
	let html = "";

	try {
		html = await request(videoUrl);
	} catch(err) {
		// Youtube returns 303 if video id not found
		if (err.statusCode === 303) return {};
		throw(err);
	}

	if (options.useWorkerThread) {
		return await scrapeWorker("getUpNext", html, options);
	} else {
		return ps.parseGetUpNext(html);
	}
};


export default {
	search,
	getPlaylist,
	getVideo,
	getRelated,
	getUpNext
};