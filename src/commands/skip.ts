import { player } from '@/main.js'
import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skips the current song'),
	async execute(interaction: ChatInputCommandInteraction) {
		player.skip(interaction.channelId) // TODO: Add validation that the person sending this command is in the same voice channel

		return interaction.reply('Skipping this song...')
	},
}
