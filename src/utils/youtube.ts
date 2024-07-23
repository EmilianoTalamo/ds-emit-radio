import queryString from 'query-string'
import ytdl from '@distube/ytdl-core'
import { URLPattern } from 'urlpattern-polyfill'

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
	const info = await ytdl.getInfo(`http://www.youtube.com/watch?v=${id}`)

	return info
}

export const getAudioStream = (id: string) => {
	return ytdl(`http://www.youtube.com/watch?v=${id}`, {
		filter: 'audioonly',
		quality: 'highest',
	})
}
