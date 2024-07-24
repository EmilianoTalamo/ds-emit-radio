import ytdl from "@distube/ytdl-core"

export type QueueItem = {
	id: string,
	title: string | null
	ytdetails?: ytdl.videoInfo['videoDetails']
}