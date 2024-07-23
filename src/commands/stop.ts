import { player, queue } from '@/main.js'
import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('stop')
		.setDescription('Stops the music and clears the queue'),
	async execute(interaction: ChatInputCommandInteraction) {
		player.stop(interaction.channelId) // TODO: Add validation that the person sending this command is in the same voice channel

		return interaction.reply('Bye!')
	},
}
