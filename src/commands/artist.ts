import { isBotAlone, isUserWithBot } from '@/handlers/channel.js'
import { connection, player, queue } from '@/main.js'
import { searchArtist } from '@/utils/youtube.js'
import {
	bold,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'

import _ from 'lodash'

export default {
	data: new SlashCommandBuilder()
		.setName('artist')
		.setDescription(
			"Adds an artist's top songs to the queue.",
		)
		.addStringOption((option) =>
			option
				.setName('name')
				.setDescription('The name of the artist')
				.setRequired(true),
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if (
			player.status === 'playing' &&
			!isUserWithBot(interaction) &&
			!isBotAlone()
		) {
			return await interaction.reply(
				`I'm currently playing music in a different voice channel than yours. Join us!`,
			)
		}

		const joined = await connection.joinVoiceByUserWhoInteracted(interaction)
		if (!joined)
			return await interaction.reply('You must be in a voice channel to play.')

		const name = interaction.options.getString('name', true)

		await interaction.reply(`🎵 ${name}-ing...`)

		const result = await searchArtist(name)

		if (!result || !result.songs.length) {
			return interaction.editReply(
				`No artist found for "${bold(name)}" on YouTube Music.`,
			)
		}

		const shuffledSongs = _.shuffle(result.songs)

		const artistInfo = {
			name: result.artistName,
			url: result.artistUrl,
		}

		for (const song of shuffledSongs) {
			queue.add(
				{
					id: song.id,
					title: song.title,
					ytdetails: undefined,
				},
				interaction.user,
				'artist',
				artistInfo,
			)
		}

		await queue.refreshInfo()

		interaction.editReply(
			`🥝 ${bold(result.artistName)}'s top ${shuffledSongs.length} songs added to the queue.`,
		)

		if (player.status === 'idle') {
			player.play(interaction.channelId)
		}
	},
}
