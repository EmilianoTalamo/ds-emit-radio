import queryString from 'query-string'
import { google } from 'googleapis'
import { URLPattern } from 'urlpattern-polyfill'
import YTMusic from 'ytmusic-api'
import { Innertube, UniversalCache } from 'youtubei.js'
import { Readable } from 'stream'
import { getCookies } from './services.js'

type GetUrlInfoResponse = {
	videoId: string | null
	playlistId: string | null
}

export const getUrlInfo = (url: string): GetUrlInfoResponse => {
	// VIDEO: https://www.youtube.com/watch?v=QKHSlBi5qok
	// VIDEO: https://youtu.be/QKHSlBi5qok
	// PLAYLIST: https://www.youtube.com/watch?v=XXYlFuWEuKI&list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj&pp=iAQB8AUB

	const trimmedUrl =
		'https://' +
		url
			.replaceAll('https', '')
			.replaceAll('http', '')
			.replaceAll('://', '')
			.replaceAll('www.', '')
			.replaceAll('"', '')
			.trim()

	const [domain, qs] = trimmedUrl.split('?')
	const query = queryString.parse(qs)

	const res: GetUrlInfoResponse = {
		videoId: null,
		playlistId: null,
	}

	if (!trimmedUrl) return res

	if (query.list) {
		// URLs with a playlist can also have a video id so we need to check
		// for a playlist first.
		//  ie. https://www.youtube.com/watch?v=:videoId&list=:playlistId
		res.playlistId = Array.isArray(query.list) ? query.list[0] : query.list
	}
	if (query.v) {
		// Check if the video id was provided in the query string.
		//   ie. https://www.youtube.com/watch?v=:videoId
		res.videoId = Array.isArray(query.v) ? query.v[0] : query.v
	} else {
		// Check for short urls, direct urls and embed urls.
		//    ie. https://youtu.be/:videoId
		//        https://www.youtube.com/v/:videoId
		//        https://www.youtube.com/embed/:videoId

		const shortVideo = new URLPattern('https://youtu.be/:videoId')

		const directVideo = new URLPattern('https://youtube.com/v/:videoId')

		const embedVideo = new URLPattern('https://youtube.com/embed/:videoId')

		const ytMusic = new URLPattern('https://music.youtube.com/embed/:videoId')

		const shortVideoId = shortVideo.exec(trimmedUrl)?.pathname.groups.videoId

		const directVideoId = directVideo.exec(trimmedUrl)?.pathname.groups.videoId

		const embedVideoId = embedVideo.exec(trimmedUrl)?.pathname.groups.videoId

		const ytMusicId = ytMusic.exec(trimmedUrl)?.pathname.groups.videoId

		res.videoId =
			ytMusicId || embedVideoId || directVideoId || shortVideoId || null
	}

	return res
}

let youtubeClient: Innertube | null = null

const getClient = async () => {
    if (youtubeClient) return youtubeClient
    youtubeClient = await Innertube.create({ cookie: await getCookies() })
    return youtubeClient
}

export type YtBasicInfo = {
    title: string
    lengthSeconds: number
    thumbnails: { url: string; width?: number; height?: number }[]
}

export const getYtInfo = async (
    id: string,
): Promise<{ basic_info: YtBasicInfo } | false> => {
    try {
        const yt = await getClient()
        const info = await yt.getInfo(id)
        const basic = info.basic_info
        return {
            basic_info: {
                title: basic.title || '',
                lengthSeconds: Number(basic.duration || 0),
                thumbnails: basic.thumbnail || [],
            },
        }
    } catch (err) {
        console.error('Error fetching YT info')
        console.error(err)
        return false
    }
}

export const getYtPlaylistIds = async (id: string) => {
	const youtube = google.youtube({
		version: 'v3',
		auth: process.env.GOOGLE_API_KEY, // Replace with your API key
	})

	let videoIds: string[] = []
	let nextPageToken: string = ''
	let page = 0

	try {
		do {
			const response = await youtube.playlistItems.list({
				part: ['id', 'contentDetails'],
				playlistId: id,
				maxResults: 50,
				pageToken: nextPageToken,
			})

			if (!response || !response?.data?.items) return false

			page++

			response.data.items.forEach((item) => {
				if (
					item.contentDetails?.videoId &&
					item.contentDetails?.videoPublishedAt
				)
					videoIds.push(item.contentDetails.videoId)
			})

			nextPageToken = response?.data?.nextPageToken || ''
		} while (nextPageToken && page <= 20) // 20 pages max (1000 vids) to prevent quota limit
	} catch (error) {
		console.error('Error fetching playlist video IDs:', error)
	}

	return videoIds
}

export const getAudioStream = async (id: string): Promise<Readable> => {
    const yt = await getClient()
    // youtubei.js exposes a download method on the client
    // Choose an audio-only format
    const stream = await yt.download(id, {
        type: 'audio',
        quality: 'best',
        format: 'mp4',
    })
    return stream as unknown as Readable
}

export const search = async (query: string) => {
	const ytmusic = new YTMusic()
	await ytmusic.initialize()

	const results = await ytmusic.searchSongs(query)

	return results[0]

}