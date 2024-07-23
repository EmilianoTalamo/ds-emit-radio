import { Events, REST, Routes } from 'discord.js'

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

export const loadCommands = async (client: any) => {
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)

	const foldersPath = path.join(__dirname, '..', 'commands')
	const commandFiles = fs
		.readdirSync(foldersPath)
		.filter((filename) => path.extname(filename) === '.ts')

	const load = commandFiles.map(async (file) => {
		try {
			console.info(file)
			const filePath = path.join(foldersPath, file)
			let { default: command } = await import(filePath)
			if ('data' in command && 'execute' in command) {
				console.info(`Loaded command: ${command.data.name}`)
				client.commands.set(command.data.name, command)
				Promise.resolve()
			} else {
				console.error(
					`[WARNING] The command at ${file} is missing a required "data" or "execute" property.`,
				)
				return false
			}
		}
		catch (err) {
			console.error(`Error loading command ${file}`)
			console.error(err)
		}
	})

	await Promise.all(load)
	return true
}

export const registerCommands = async (
	rest: REST,
	clientId: string = '',
	guildId: string = '',
	commands: any,
) => {
	try {
		await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
			body: commands.map((command: any) => command.data.toJSON()),
		})
		return true
	} catch (err) {
		console.error('Error registering commands to Discord')
		console.error(err)
	}
}

export const handleCommands = async (client: any) => {
	client.on(Events.InteractionCreate, async (interaction: any) => {
		if (!interaction.isChatInputCommand()) return
		const command = interaction.client.commands.get(interaction.commandName)

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`)
			return
		}

		try {
			await command.execute(interaction)
		} catch (error) {
			console.error(error)
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				})
			} else {
				await interaction.reply({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				})
			}
		}
	})
}
