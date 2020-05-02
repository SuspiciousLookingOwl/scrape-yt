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


export default {
	/**
	 * Search youtube for a list of  based on a search query.
	 * @param query Search Query
	 * @param options (optional) Option for search type and limit
	 */
	search: (query: string, options: SearchOptions={}): Promise<(Video|Channel|Playlist)[]> => {
		return new Promise((resolve, reject) => {
			if (options === undefined) options = {};
			options = {
				type: "video",
				limit: 10,
				page: 1,
				...options
			};
			let searchUrl = url + "results?";
			if (query.trim().length === 0) return reject(new Error("Query cannot be blank"));
			if (options.type && searchType[options.type]) searchUrl += `sp=${searchType[options.type]}&`;
			else searchUrl += `sp=${searchType["video"]}&`; //Default type will be video
			searchUrl += `page=${options.page}&search_query=${query}`;
			request(searchUrl).then((html: string) => {
				resolve(ps.parseSearch(html, options));
			}).catch((err) => {
				reject(err);
			});
		});
	},

	/**
	 * Search youtube for playlist information.
	 * @param playlistId Id of the playlist
	 */
	getPlaylist: (playlistId: string): Promise<PlaylistDetailed|{}> => {
		return new Promise((resolve, reject) => {
			if (playlistId.trim().length === 0) return reject(new Error("Playlist ID cannot be blank"));
			const playlistUrl = `${url}playlist?list=${playlistId}`;
			request(playlistUrl).then((html: string) => {
				resolve(ps.parseGetPlaylist(html));
			}).catch((err) => {
				reject(err);
			});
		});
	},

	/**
	 * Search youtube for video information.
	 * @param videoId Id of the video
	 */
	getVideo: (videoId: string): Promise<VideoDetailed|{}> => {
		return new Promise((resolve, reject) => {
			if (videoId.trim().length === 0) return reject(new Error("Video ID cannot be blank"));
			const videoUrl = `${url}watch?v=${videoId}`;
			request(videoUrl).then((html: string) => {
				resolve(ps.parseGetVideo(html));
			}).catch((err) => {
				reject(err);
			});
		});
	},

	/**
	 * Search youtube for related videos based on videoId .
	 * @param videoId Id of the video
	 * @param limit (optional) Max videos count
	 */
	getRelated: (videoId: string, limit = 10): Promise<Video[]> => {
		return new Promise((resolve, reject) => {
			if (videoId.trim().length === 0) return reject(new Error("Video ID cannot be blank"));
			const videoUrl = `${url}watch?v=${videoId}`;
			request(videoUrl).then((html: string) => {
				resolve(ps.parseGetRelated(html, limit));
			}).catch((err) => {
				reject(err);
			});
		});
	},

	/**
	 * Search youtube for up next video based on videoId.
	 * @param videoId Id of the video
	 */
	getUpNext: (videoId: string): Promise<Video|{}> => {
		return new Promise((resolve, reject) => {
			if (videoId.trim().length === 0) return reject(new Error("Video ID cannot be blank"));
			const videoUrl = `${url}watch?v=${videoId}`;
			request(videoUrl).then((html: string) => {
				resolve(ps.parseGetUpNext(html));
			}).catch((err) => {
				reject(err);
			});
		});
	}

};