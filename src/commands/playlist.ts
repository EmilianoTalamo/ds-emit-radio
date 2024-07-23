import { joinVoice } from '@/handlers/channel.js'
import { player, queue } from '@/main.js'
import { getUrlInfo, getYtInfo } from '@/utils/youtube.js'
import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'

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
		const joined = await joinVoice(interaction)

		if (!joined)
			return await interaction.reply('You must be in a voice channel to play.')

		const url = interaction.options.data[0].value as string

		const urlInfo = getUrlInfo(url)

		if (!url || !urlInfo.playlistId) return await interaction.reply('Invalid URL')

		return interaction.reply('Playlists are WIP')

		// const ytinfo = await getYtInfo(urlInfo.videoId)

		// if (!ytinfo)
		// 	return await interaction.reply(`Invalid YouTube ID: ${urlInfo.videoId}`)

		// queue.add({ id: urlInfo.videoId, title: ytinfo.videoDetails.title })

		// if (player.status === 'idle') player.play(interaction.channelId)

		// return interaction.reply(
		// 	`Song ${ytinfo.videoDetails.title} added to the queue.`,
		// )
	},
}
