import { joinVoice } from '@/handlers/channel.js'
import { player, queue } from '@/main.js'
import { getUrlInfo, getYtPlaylistIds } from '@/utils/youtube.js'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('playlist')
		.setDescription('Plays a YouTube playlist or adds it to the queue')
		.addStringOption((option) =>
			option
				.setName('url')
				.setDescription('Youtube link of the playlist')
				.setRequired(true),
		),
	async execute(interaction: ChatInputCommandInteraction) {
		// Join user voice channel
		const joined = await joinVoice(interaction)
		if (!joined)
			return await interaction.reply('You must be in a voice channel to play.')

		// Read URL sent by the user
		const url = interaction.options.data[0].value as string
		const urlInfo = getUrlInfo(url)
		if (!url || !urlInfo.playlistId)
			return await interaction.reply('Invalid URL')

		// Reply to the user if the playlist seems ok
		interaction.reply('🥝 Playlist added to the queue.')

		// Get array of IDs from the playlist
		const idsArray = await getYtPlaylistIds(urlInfo.playlistId)
		if (!idsArray || !idsArray.length) {
			return
		}
		
		// add ids to the queue
		for (const id of idsArray) {
			queue.add({
				id,
				title: null,
			})
		}

		await queue.refreshInfo()

		// Start playlist reproduction
		// if the bot is idle.
		if(player.status === 'idle') {
			player.play(interaction.channelId)
		}

		return
	}
}

