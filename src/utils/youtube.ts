import queryString from 'query-string'
import { URLPattern } from 'urlpattern-polyfill'
import YTMusic from 'ytmusic-api'
import { getYtInfo as getYtInfoYtDlp, getAudioStream as getAudioStreamYtDlp, getYtPlaylistIds as getYtPlaylistIdsYtDlp, getYtPlaylistInfo as getYtPlaylistInfoYtDlp, searchYoutube, YtBasicInfo } from './ytdlp.js'

// Re-export types
export type { YtBasicInfo }

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

// Use yt-dlp implementation directly
export const getYtInfo = getYtInfoYtDlp

export const getYtPlaylistIds = getYtPlaylistIdsYtDlp

export const getYtPlaylistInfo = getYtPlaylistInfoYtDlp

export const getAudioStream = getAudioStreamYtDlp

export const search = async (query: string) => {
	return await searchYoutube(query)
}

export type YtMusicArtistResult = {
	artistName: string
	artistUrl: string
	songs: Array<{ id: string; title: string | null }>
}

let ytmusic: YTMusic | null = null

const getYTMusic = async (): Promise<YTMusic> => {
	if (!ytmusic) {
		ytmusic = new YTMusic()
		await ytmusic.initialize()
	}
	return ytmusic
}

export const searchArtist = async (
	query: string,
): Promise<YtMusicArtistResult | null> => {
	try {
		const yt = await getYTMusic()

		const artists = await yt.searchArtists(query)
		if (!artists.length) return null

		const artist = artists[0]

		let topSongs = await yt.getArtistSongs(artist.artistId)
		if (!topSongs.length) {
			const artistFull = await yt.getArtist(artist.artistId)
			topSongs = artistFull.topSongs
		}

		if (!topSongs.length) return null

		const songs = topSongs.slice(0, 10).map((song) => ({
			id: song.videoId,
			title: song.name,
		}))

		return {
			artistName: artist.name,
			artistUrl: `https://music.youtube.com/channel/${artist.artistId}`,
			songs,
		}
	} catch (error: any) {
		if (
			error.message?.includes('Connect Timeout Error') ||
			error.code === 'ETIMEDOUT' ||
			error.code === 'ECONNRESET' ||
			error.code === 'ENOTFOUND'
		) {
			console.log(`⚠️  Network error searching for artist: ${query}`)
			return null
		}

		console.error('Error searching YouTube Music for artist:', error.message)
		return null
	}
}
