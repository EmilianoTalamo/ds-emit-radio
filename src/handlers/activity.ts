import client, { queue } from "@/main.js"
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
				url: `https://youtube.com/watch?v=${queue.queue[0].id}`,

			},
		],
		status: 'dnd',
	})
}