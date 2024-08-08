import { spotify } from '@/main.js'
import {
	Page,
	PlaylistedTrack,
	SimplifiedArtist,
	SpotifyApi,
	Track,
} from '@spotify/web-api-ts-sdk'

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

	// https://open.spotify.com/album/7hMNG2Sl4qDB3gROXj2NSH?si=Rm-39J4pRoyYkU9K8k71ig
	const spotifyPlaylistPattern = new URLPattern(
		'https://open.spotify.com/:type/:playlistId',
	)

	return {
		id:
			spotifyPlaylistPattern.exec(trimmedUrl)?.pathname.groups.playlistId || '',
		type:
			spotifyPlaylistPattern.exec(trimmedUrl)?.pathname.groups.type ||
			'invalid',
	}
}

export const getTracksFromPlaylist = async (
	playlistUrl: string,
): Promise<
	{
		artist: SimplifiedArtist[]
		title: string
	}[]
> => {
	const playlistInfo = getPlaylistId(playlistUrl)

	if (!playlistInfo.id || playlistInfo.type === 'invalid') return []

	if (playlistInfo.type === 'playlist')
		return await fetchPlaylist(playlistInfo.id)

	if (playlistInfo.type === 'album') return await fetchAlbum(playlistInfo.id)

	return []
}

const fetchPlaylist = async (playlistId: string) => {
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

	return playlistItems.map((track) => ({
		artist: track.track.artists,
		title: track.track.name,
	}))
}

const fetchAlbum = async (albumId: string) => {
	const albumItems = []
	let next = true
	let offset = 0

	do {
		const items = await spotify.sdk.albums.tracks(
			albumId,
			undefined,
			50,
			offset,
		)
		albumItems.push(...items.items)
		offset++

		if (!items.next) {
			next = false
		}
	} while (next)

	return albumItems.map((track) => ({
		artist: track.artists,
		title: track.name,
	}))
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
