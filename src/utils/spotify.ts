import { spotify } from '@/main.js'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

export class SpotifyWebApi {
	clientId: string
	clientSecret: string
	sdk: SpotifyApi
	constructor() {
		this.clientId = process.env.SPOTIFY_CLIENT_ID || ''
		this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || ''
		this.sdk = SpotifyApi.withClientCredentials(
			this.clientId,
			this.clientSecret,
		)
	}
}

const getPlaylistId = (url: string) => {
	const trimmedUrl =
		'https://' +
		url
			.replaceAll('https', '')
			.replaceAll('http', '')
			.replaceAll('://', '')
			.replaceAll('www.', '')
			.replaceAll('"', '')
			.trim()

	// https://open.spotify.com/playlist/3X4hFq5OmXwZS7NlweCfAJ?si=0d690a7156db40ba
	const spotifyPlaylistPattern = new URLPattern(
		'https://open.spotify.com/playlist/:playlistId',
	)

	return (
		spotifyPlaylistPattern.exec(trimmedUrl)?.pathname.groups.playlistId || ''
	)
}

export const getTracksFromPlaylist = async (playlistUrl: string) => {
	const playlistId = getPlaylistId(playlistUrl)

	if (!playlistId) return []

	const playlistItems = []
	let next = true
	let offset = 0

	do {
		const items = await spotify.sdk.playlists.getPlaylistItems(
			playlistId,
			undefined,
			undefined,
			50,
			offset * 50,
		)
		playlistItems.push(...items.items)
		offset++

		if (!items.next) {
			next = false
		}
	} while (next)

	return playlistItems || []
}

const getSongId = (url: string) => {
	// https://open.spotify.com/track/4DnxFR8INQGkGAz1Oq32pr?si=a1a844b76c3a4815

	const trimmedUrl =
		'https://' +
		url
			.replaceAll('https', '')
			.replaceAll('http', '')
			.replaceAll('://', '')
			.replaceAll('www.', '')
			.replaceAll('"', '')
			.trim()

	const spotifySongPattern = new URLPattern(
		'https://open.spotify.com/track/:songId',
	)

	return spotifySongPattern.exec(trimmedUrl)?.pathname.groups.songId || ''
}

export const getSongInfo = async (songUrl: string) => {
	const songId = getSongId(songUrl)

	if (!songId) return false

	const songData = await spotify.sdk.tracks.get(songId)

	return songData || false
}
