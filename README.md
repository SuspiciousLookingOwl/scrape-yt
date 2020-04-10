# scrape-yt
Simple package to scrape information from Youtube such as search results, video information, related videos, and up next video

## Installation
```bash
npm install scrape-yt
```

## Usage

```js
const scrapeYoutube = require("scrape-yt");

//Searches for "Never gonna give you up" with limit of 5 videos
await scrapeYoutube.search("Never gonna give you up", 5); 

//Get video information of video id "dQw4w9WgXcQ"
await scrapeYoutube.getUpNext("dQw4w9WgXcQ");


// -- Or use promises --

//Searches for videos related to video id "dQw4w9WgXcQ" with limit of 10 (default) videos
scrapeYoutube.getRelated("dQw4w9WgXcQ").then(videos => {
    console.log(videos);
});

//Searches for up next video of video id "dQw4w9WgXcQ"
scrapeYoutube.getUpNext("dQw4w9WgXcQ").then(video => {
    console.log(video)
});
```

## Results
Result example from `search()`:
```json
{
    "id": "dQw4w9WgXcQ",
    "channel": {
        "url": "https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw",
        "name": "Official Rick Astley"
    },
    "title": "Rick Astley - Never Gonna Give You Up (Video)",
    "duration": 213,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg?sqp=-oaymwEjCPYBEIoBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLBW5JbJn5nTCNKe8PvMuOqEiuttiQ",
    "uploadDate": "10 tahun yang lalu",
    "viewCount": 674956881
}
```
Result example from `getRelated()` and `getUpNext()`
```json
{
    "id": "dQw4w9WgXcQ",
    "channel": {
        "id": "UCuAXFkgsw1L7xaCfnd5JJOw",
        "name": "Official Rick Astley"
    },
    "title": "Rick Astley - Never Gonna Give You Up (Video)",
    "duration": 213,
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg?sqp=-oaymwEjCPYBEIoBSFryq4qpAxUIARUAAAAAGAElAADIQj0AgKJDeAE=&rs=AOn4CLBW5JbJn5nTCNKe8PvMuOqEiuttiQ",
    "uploadDate": "10 tahun yang lalu",
    "viewCount": 674956881
}
```
Result example from `getVideo()`
```json
{
    "id": "dQw4w9WgXcQ",
    "channel": {
        "id": "UCuAXFkgsw1L7xaCfnd5JJOw",
        "name": "Official Rick Astley",
        "thumbnail": "https//yt3.ggpht.com/a-/AOh14GirqtIADQGwQOF14rTXYeSzIkuySwxwlqAZyzo0mQ=s176-c-k-c0xffffffff-no-nd-rj"
    },
    "title": "Rick Astley - Never Gonna Give You Up (Video)",
    "description": "Rick Astley's official music video for “Never Gonna Give You Up” \nListen to Rick Astley: https://RickAstley.lnk.to/_listenYD\n\nSubscribe to the official Rick Astley YouTube channel: https://RickAstley.lnk.to/subscribeYD\n\nFollow Rick Astley:\nFacebook: https://RickAstley.lnk.to/followFI\nTwitter: https://RickAstley.lnk.to/followTI\nInstagram: https://RickAstley.lnk.to/followII\nWebsite: https://RickAstley.lnk.to/followWI\nSpotify: https://RickAstley.lnk.to/followSI\n\nLyrics:\nNever gonna give you up\nNever gonna let you down\nNever gonna run around and desert you\nNever gonna make you cry\nNever gonna say goodbye\nNever gonna tell a lie and hurt you\n\n#RickAstley #NeverGonnaGiveYouUp #DancePop",
    "uploadDate": "Dipublikasikan tanggal 24 Okt 2009",
    "viewCount": 675343111,
    "likeCount": 5183544,
    "dislikeCount": 192238,
    "tags": [
        "#RickAstley",
        "#NeverGonnaGiveYouUp",
        "#DancePop"
    ]
}
```

**Note**:
* `duration` is in second
* `uploadDate` language is based on  the default language the youtube set for you 


## License
[MIT](https://choosealicense.com/licenses/mit/)

Modified from [scrape-youtube](https://github.com/DrKain/scrape-youtube)