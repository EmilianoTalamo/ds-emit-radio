import client from "@/main.js"
import { ActivityType } from "discord.js"

export const idlePresence = () => {
	client.user.setPresence({
		activities: [
			{
				name: `💤`,
				type: ActivityType.Custom,
			},
		],
		status: 'online',
	})
}

export const musicPresence = (title?: string) => {
	client.user.setPresence({
		activities: [
			{
				name: title || '🎶',
				type: ActivityType.Listening,
			},
		],
		status: 'dnd',
	})
}