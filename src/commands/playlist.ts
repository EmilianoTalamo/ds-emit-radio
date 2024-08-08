import { isBotAlone, isUserWithBot } from '@/handlers/channel.js'
import { connection, player, queue } from '@/main.js'
import { joinArtists } from '@/utils/format.js'
import { identifyService } from '@/utils/services.js'
import { getTracksFromPlaylist } from '@/utils/spotify.js'
import { getUrlInfo, getYtPlaylistIds } from '@/utils/youtube.js'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('playlist')
		.setDescription('Plays a YouTube/Spotify playlist, or adds it to the queue')
		.addStringOption((option) =>
			option
				.setName('url')
				.setDescription('Youtube or Spotify link of the playlist')
				.setRequired(true),
		),
	async execute(interaction: ChatInputCommandInteraction) {
		// This command shouldn't be triggered if the bot is playing music
		// and the user is in a different voice channel.
		if (
			player.status === 'playing' &&
			!isUserWithBot(interaction) &&
			!isBotAlone()
		) {
			return await interaction.reply(
				`I'm currently playing music in a different voice channel than yours. Join us!`,
			)
		}

		// Join user voice channel
		const joined = await connection.joinVoiceByUserWhoInteracted(interaction)
		if (!joined)
			return await interaction.reply('You must be in a voice channel to play.')

		await interaction.deferReply()

		// Read URL sent by the user
		const url = interaction.options.data[0].value as string
		const service = identifyService(url)

		let result = 0

		if (service === 'spotify') result = await handleSpotify(interaction, url)
		else result = await handleYoutube(interaction, url)

		if (!result) return

		await queue.refreshInfo()

		interaction.editReply(
			`🥝 Playlist with ${result} songs added to the queue.`,
		)

		// Start playlist reproduction
		// if the bot is idle.
		if (player.status === 'idle') {
			player.play(interaction.channelId)
		}

		return
	},
}

const handleYoutube = async (
	interaction: ChatInputCommandInteraction,
	url: string,
): Promise<number> => {
	const urlInfo = getUrlInfo(url)
	if (!url || !urlInfo.playlistId) {
		await interaction.editReply('Invalid URL')
		return 0
	}

	// Reply to the user if the playlist seems ok
	interaction.editReply('🫡 Your playlist will be added shortly.')

	// Get array of IDs from the playlist
	const idsArray = await getYtPlaylistIds(urlInfo.playlistId)
	if (!idsArray || !idsArray.length) {
		await interaction.editReply(`The playlist doesn't seem valid.`)
		return 0
	}

	interaction.editReply('🫡 Your playlist will be added shortly...')

	// add ids to the queue
	for (const id of idsArray) {
		queue.add({
			id,
			title: null,
		})
	}

	return idsArray.length
}

const handleSpotify = async (
	interaction: ChatInputCommandInteraction,
	url: string,
) => {
	interaction.editReply('🫡 Your playlist will be added shortly.')

	const tracks = await getTracksFromPlaylist(url)

	if (!tracks || !tracks.length) {
		await interaction.editReply(`The playlist doesn't seem valid.`)
		return 0
	}

	interaction.editReply('🫡 Your playlist will be added shortly...')

	for (const track of tracks) {
		queue.add({
			id: null,
			title: `${joinArtists(track.artist)} - ${track.title}`,
		})
	}

	return tracks.length
}
