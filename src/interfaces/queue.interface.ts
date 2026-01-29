import type { YtBasicInfo } from '@/utils/youtube.js'
import type { User } from 'discord.js'

export type QueueItem = {
	id: string | null,
	title: string | null
    ytdetails?: YtBasicInfo
	addedBy?: {
		id: string
		username: string
		displayName: string
		avatar?: string | null
	}
}