"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryDownload = exports.downloadPlaylist = exports.downloadAlbum = exports.downloadTrack = void 0;
const index_1 = require("./index");
const node_id3_1 = __importDefault(require("node-id3"));
const ytdl = require("ytdl-core");
const axios_1 = __importDefault(require("axios"));
const youtubedl = require('youtube-dl-exec');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');
// Private Methods
const dl_track = async (id, filename) => {
    return await new Promise((resolve, reject) => {
        youtubedl('https://www.youtube.com/watch?v=' + id, {
            audioFormat: 'mp3',
            extractAudio: true,
            audioQuality: 0,
            output: filename,
            addMetadata: true,
            addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
            ffmpegLocation: ffmpeg.path
        })
            .then((output) => {
            console.log(output);
            resolve(true);
        })
            .catch((err) => {
            console.error("An error occurred:", err.message);
            resolve(false);
        });
    });
};
const dl_album_normal = async (obj, oPath, tags) => {
    let Results = [];
    for await (let res of obj.tracks) {
        let sanitizedTitle = res.title.replace(/[/\\]/g, ' ');
        let filename = `${oPath}${sanitizedTitle}.mp3`;
        let dlt = await dl_track(res.id, filename);
        if (dlt) {
            let tagStatus = node_id3_1.default.update(tags, filename);
            if (tagStatus) {
                console.log(`Finished: ${filename}`);
                Results.push({ status: 'Success', filename: filename });
            }
            else {
                console.log(`Failed: ${filename} (tags)`);
                Results.push({ status: 'Failed (tags)', filename: filename, tags: tags });
            }
        }
        else {
            console.log(`Failed: ${filename} (stream)`);
            Results.push({ status: 'Failed (stream)', filename: filename, id: res.id, tags: tags });
        }
    }
    return Results;
};
// END
/**
 * Download the Spotify Track, need a <Track> type for first param, the second param is optional
 * @param {Track} obj An object of type <Track>, contains Track details and info
 * @param {string} outputPath - String type, (optional) if not specified the output will be on the current dir
 * @returns {Results[]} <Results[]> if successful, `string` if failed
 */
const downloadTrack = async (obj, outputPath = './') => {
    try {
        // Check type and check if file path exists...
        if ((0, index_1.checkType)(obj) != 'Track') {
            throw Error('obj passed is not of type <Track>');
        }
        let albCover = await axios_1.default.get(obj.albumCoverURL, { responseType: 'arraybuffer' });
        let tags = {
            title: obj.title,
            artist: obj.artist,
            album: obj.album,
            year: obj.year,
            trackNumber: obj.trackNumber,
            image: {
                imageBuffer: Buffer.from(albCover.data, 'utf-8')
            }
        };
        let sanitizedTitle = obj.title.replace(/[/\\]/g, ' ');
        let filename = `${(0, index_1.checkPath)(outputPath)}${sanitizedTitle}.mp3`;
        // EXPERIMENTAL
        let dlt = await dl_track(obj.id, filename);
        if (dlt) {
            let tagStatus = node_id3_1.default.update(tags, filename);
            if (tagStatus) {
                return [{ status: 'Success', filename: filename }];
            }
            else {
                return [{ status: 'Failed (tags)', filename: filename, tags: tags }];
            }
        }
        else {
            return [{ status: 'Failed (stream)', filename: filename, id: obj.id, tags: tags }];
        }
    }
    catch (err) {
        return `Caught: ${err}`;
    }
};
exports.downloadTrack = downloadTrack;
/**
 * Download the Spotify Album, need a <Album> type for first param, the second param is optional,
 * function will return an array of <Results>
 * @param {Album} obj An object of type <Album>, contains Album details and info
 * @param {string} outputPath - String type, (optional) if not specified the output will be on the current dir
 * @param {boolean} sync - Boolean type, (optional) can be `true` or `false`. Default (true) is safer/less errors, for slower bandwidths
 * @returns {Results[]} <Results[]> if successful, `string` if failed
 */
const downloadAlbum = async (obj, outputPath = './', sync = true) => {
    try {
        if ((0, index_1.checkType)(obj) != 'Album') {
            throw Error('obj passed is not of type <Album>');
        }
        let albCover = await axios_1.default.get(obj.albumCoverURL, { responseType: 'arraybuffer' });
        let tags = {
            artist: obj.artist,
            album: obj.name,
            year: obj.year,
            image: {
                imageBuffer: Buffer.from(albCover.data, 'utf-8')
            }
        };
        let oPath = (0, index_1.checkPath)(outputPath);
        return await dl_album_normal(obj, oPath, tags);
    }
    catch (err) {
        return `Caught: ${err}`;
    }
};
exports.downloadAlbum = downloadAlbum;
/**
 * Download the Spotify Playlist, need a <Playlist> type for first param, the second param is optional,
 * function will return an array of <Results>
 * @param {Playlist} obj An object of type <Playlist>, contains Playlist details and info
 * @param {string} outputPath - String type, (optional) if not specified the output will be on the current dir
 * @returns {Results[]} <Results[]> if successful, `string` if failed
 */
const downloadPlaylist = async (obj, outputPath = './') => {
    try {
        let Results = [];
        if ((0, index_1.checkType)(obj) != 'Playlist') {
            throw Error('obj passed is not of type <Playlist>');
        }
        let oPath = (0, index_1.checkPath)(outputPath);
        for await (let res of obj.tracks) {
            let sanitizedTitle = res.title.replace(/[/\\]/g, ' ');
            let filename = `${oPath}${sanitizedTitle}.mp3`;
            let dlt = await dl_track(res.id, filename);
            let albCover = await axios_1.default.get(res.albumCoverURL, { responseType: 'arraybuffer' });
            let tags = {
                title: res.title,
                artist: res.artist,
                album: res.album,
                // year: 0, // Year tag doesn't exist when scraping
                trackNumber: res.trackNumber,
                image: {
                    imageBuffer: Buffer.from(albCover.data, 'utf-8')
                }
            };
            if (dlt) {
                let tagStatus = node_id3_1.default.update(tags, filename);
                if (tagStatus) {
                    console.log(`Finished: ${filename}`);
                    Results.push({ status: 'Success', filename: filename });
                }
                else {
                    console.log(`Failed: ${filename} (tags)`);
                    Results.push({ status: 'Failed (tags)', filename: filename, tags: tags });
                }
            }
            else {
                console.log(`Failed: ${filename} (stream)`);
                Results.push({ status: 'Failed (stream)', filename: filename, id: res.id, tags: tags });
            }
        }
        return Results;
    }
    catch (err) {
        return `Caught: ${err}`;
    }
};
exports.downloadPlaylist = downloadPlaylist;
/**
 * Retries the download process if there are errors. Only use this after `downloadTrack()` or `downloadAlbum()` methods
 * checks for failed downloads then tries again, returns <Results[]> object array
 * @param {Results[]} Info An object of type <Results[]>, contains an array of results
 * @returns {Results[]} <Results[]> array if the download process is successful, `true` if there are no errors and `false` if an error happened.
 */
const retryDownload = async (Info) => {
    try {
        if ((0, index_1.checkType)(Info) != 'Results[]') {
            throw Error('obj passed is not of type <Results[]>');
        }
        // Filter the results
        let failedStream = Info.filter((i) => i.status == 'Failed (stream)' || i.status == 'Failed (tags)');
        if (failedStream.length == 0) {
            return true;
        }
        let Results = [];
        failedStream.map(async (i) => {
            if (i.status == 'Failed (stream)') {
                let dlt = await dl_track(i.id, i.filename);
                if (dlt) {
                    let tagStatus = node_id3_1.default.update(i.tags, i.filename);
                    if (tagStatus) {
                        Results.push({ status: 'Success', filename: i.filename });
                    }
                    else {
                        Results.push({ status: 'Failed (tags)', filename: i.filename, tags: i.tags });
                    }
                }
                else {
                    Results.push({ status: 'Failed (stream)', filename: i.filename, id: i.id, tags: i.tags });
                }
            }
            else if (i.status == 'Failed (tags)') {
                let tagStatus = node_id3_1.default.update(i.tags, i.filename);
                if (tagStatus) {
                    Results.push({ status: 'Success', filename: i.filename });
                }
                else {
                    Results.push({ status: 'Failed (tags)', filename: i.filename, tags: i.tags });
                }
            }
        });
        return Results;
    }
    catch (err) {
        console.error(`Caught: ${err}`);
        return false;
    }
};
exports.retryDownload = retryDownload;
