/**
 * For worker thread
 */

import { parentPort, workerData } from "worker_threads";
import ps from "./parser";

const data = workerData;

if (data.scraper === "search") {
    parentPort?.postMessage(ps.parseSearch(data.html, data.options));
} else if (data.scraper === "getPlaylist") {
    parentPort?.postMessage(ps.parseGetPlaylist(data.html));
} else if (data.scraper === "getVideo") {
    parentPort?.postMessage(ps.parseGetVideo(data.html));
} else if (data.scraper === "getRelated") {
    parentPort?.postMessage(ps.parseGetRelated(data.html, data.options.limit));
} else if (data.scraper === "getUpNext") {
    parentPort?.postMessage(ps.parseGetUpNext(data.html));
}