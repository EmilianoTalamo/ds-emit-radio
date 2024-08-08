import queryString from 'query-string'
import ytdl from '@distube/ytdl-core'
import { google } from 'googleapis'
import { URLPattern } from 'urlpattern-polyfill'
import YTMusic from 'ytmusic-api'
import { agent } from '@/main.js'

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

export const getYtInfo = async (
	id: string,
): Promise<ytdl.videoInfo | false> => {
	if (!ytdl.validateID(id)) return false

	let info: ytdl.videoInfo | false = false
	try {
		info = await ytdl.getInfo(`http://www.youtube.com/watch?v=${id}`, { agent })
	} catch (err) {
		console.error('Error fetching YT info')
		console.error(err)
		return false
	}

	return info
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

export const getAudioStream = (id: string) => {
	return ytdl(`http://www.youtube.com/watch?v=${id}`, {
		filter: 'audioonly',
		quality: 'highestaudio',
		dlChunkSize: 0,
		highWaterMark: 1 << 62,
		liveBuffer: 1 << 62,
	})
}

export const search = async (query: string) => {
	const ytmusic = new YTMusic()
	await ytmusic.initialize()

	const results = await ytmusic.searchSongs(query)

	return results[0]

}