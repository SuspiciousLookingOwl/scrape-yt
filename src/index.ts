import ps from "./common/parser";
import bent from "bent";
import {
	Video,
	VideoDetailed,
	Playlist,
	PlaylistDetailed,
	Channel,
	SearchOptions
} from "./common/types";

const request = bent("string");
const url = "https://www.youtube.com/";
const searchType = {
	video: "EgIQAQ%3D%3D",
	playlist: "EgIQAw%3D%253D",
	channel: "EgIQAg%3D%253D"
};

export * from "./common/types";

export const scrapeYt = {
	/**
	 * Search youtube for a list of  based on a search query.
	 * @param query Search Query
	 * @param options (optional) Option for search type and limit
	 */
	search: async (query: string, options: SearchOptions={}): Promise<(Video|Channel|Playlist)[]> => {
		if (options === undefined) options = {};
		options = {
			type: "video",
			limit: 10,
			page: 1,
			...options
		};
		let searchUrl = url + "results?";
		if (query.trim().length === 0) throw(new Error("Query cannot be blank"));
		if (options.type && searchType[options.type]) searchUrl += `sp=${searchType[options.type]}&`;
		else searchUrl += `sp=${searchType["video"]}&`; //Default type will be video
		searchUrl += `page=${options.page}&search_query=${query}`;
			
		const html = await request(searchUrl);
		return ps.parseSearch(html, options);
	},

	/**
	 * Search youtube for playlist information.
	 * @param playlistId Id of the playlist
	 */
	getPlaylist: async (playlistId: string): Promise<PlaylistDetailed|{}> => {
		if (playlistId.trim().length === 0) throw (new Error("Playlist ID cannot be blank"));
		const playlistUrl = `${url}playlist?list=${playlistId}`;
		const html = await request(playlistUrl);
		return ps.parseGetPlaylist(html);
	},

	/**
	 * Search youtube for video information.
	 * @param videoId Id of the video
	 */
	getVideo: async (videoId: string): Promise<VideoDetailed|{}> => {
		if (videoId.trim().length === 0) throw(new Error("Video ID cannot be blank"));
		const videoUrl = `${url}watch?v=${videoId}`;
		const html = await request(videoUrl);
		return ps.parseGetVideo(html);
	},

	/**
	 * Search youtube for related videos based on videoId .
	 * @param videoId Id of the video
	 * @param limit (optional) Max videos count
	 */
	getRelated: async (videoId: string, limit = 10): Promise<Video[]> => {
		if (videoId.trim().length === 0) throw(new Error("Video ID cannot be blank"));
		const videoUrl = `${url}watch?v=${videoId}`;
		const html = await request(videoUrl);
		return ps.parseGetRelated(html, limit);
	},

	/**
	 * Search youtube for up next video based on videoId.
	 * @param videoId Id of the video
	 */
	getUpNext: async (videoId: string): Promise<Video|{}> => {
		if (videoId.trim().length === 0) throw(new Error("Video ID cannot be blank"));
		const videoUrl = `${url}watch?v=${videoId}`;
		const html = await request(videoUrl);
		return ps.parseGetUpNext(html);
	}

};