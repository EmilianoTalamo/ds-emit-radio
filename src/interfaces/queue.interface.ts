import type { YtBasicInfo } from '@/utils/youtube.js'

export type QueueItem = {
	id: string | null,
	title: string | null
    ytdetails?: YtBasicInfo
}