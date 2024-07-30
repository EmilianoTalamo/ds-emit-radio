import ytdl from "@distube/ytdl-core"

export type QueueItem = {
	id: string | null,
	title: string | null
	ytdetails?: ytdl.videoInfo['videoDetails']
}