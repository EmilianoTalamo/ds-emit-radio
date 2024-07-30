import { isUserWithBot } from '@/handlers/channel.js'
import { player, queue } from '@/main.js'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stops the music and clears the queue'),
	async execute(interaction: ChatInputCommandInteraction) {
		// This command shouldn't be triggered if the bot is playing music
		// and the user is in a different voice channel.
		if (player.status === 'playing' && !isUserWithBot(interaction)) {
			return await interaction.reply(
				`I'm currently playing music in a different voice channel than yours. Join us!`,
			)
		}

		player.stop(interaction.channelId)

		return interaction.reply('Bye!')
	},
}
