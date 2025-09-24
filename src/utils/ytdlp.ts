import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { Readable } from 'stream'

const execAsync = promisify(exec)

export type YtBasicInfo = {
	title: string
	lengthSeconds: number
	thumbnails: { url: string; width?: number; height?: number }[]
}

/**
 * Get video information using yt-dlp
 */
export const getYtInfo = async (
	id: string,
): Promise<{ basic_info: YtBasicInfo } | false> => {
	try {
		const url = `https://www.youtube.com/watch?v=${id}`
		const { stdout } = await execAsync(
			`yt-dlp --dump-json --no-playlist "${url}"`,
		)
		
		const info = JSON.parse(stdout.trim())
		
		return {
			basic_info: {
				title: info.title || '',
				lengthSeconds: Number(info.duration || 0),
				thumbnails: info.thumbnails || [],
			},
		}
	} catch (err) {
		console.error('Error fetching YT info with yt-dlp:', err)
		return false
	}
}

/**
 * Get audio stream using yt-dlp
 */
export const getAudioStream = async (id: string): Promise<Readable> => {
	const url = `https://www.youtube.com/watch?v=${id}`
	
	// Use yt-dlp to get the best audio format URL
	const ytdlp = spawn('yt-dlp', [
		'--format', 'bestaudio/best',
		'--output', '-',
		'--quiet',
		'--no-playlist',
		url
	])

	if (!ytdlp.stdout) {
		throw new Error('Failed to create yt-dlp audio stream')
	}

	// Handle errors
	ytdlp.stderr?.on('data', (data) => {
		console.error('yt-dlp stderr:', data.toString())
	})

	ytdlp.on('error', (error) => {
		console.error('yt-dlp process error:', error)
	})

	return ytdlp.stdout
}

/**
 * Get playlist video IDs using yt-dlp
 */
export const getYtPlaylistIds = async (playlistId: string): Promise<string[] | false> => {
	try {
		const url = `https://www.youtube.com/playlist?list=${playlistId}`
		const { stdout } = await execAsync(
			`yt-dlp --flat-playlist --dump-json --no-warnings "${url}"`
		)
		
		const lines = stdout.trim().split('\n').filter(line => line.trim())
		const videoIds: string[] = []
		
		for (const line of lines) {
			try {
				const info = JSON.parse(line)
				if (info.id) {
					videoIds.push(info.id)
				}
			} catch (e) {
				// Skip invalid JSON lines
				continue
			}
		}
		
		return videoIds
	} catch (error) {
		console.error('Error fetching playlist video IDs with yt-dlp:', error)
		return false
	}
}

/**
 * Search for videos using yt-dlp
 */
export const searchYoutube = async (query: string): Promise<any> => {
	try {
		const { stdout } = await execAsync(
			`yt-dlp "ytsearch:${query}" --dump-json --no-playlist --max-downloads 1`
		)
		
		const info = JSON.parse(stdout.trim())
		return {
			videoDetails: {
				videoId: info.id,
				title: info.title,
				lengthSeconds: info.duration,
			}
		}
	} catch (error) {
		console.error('Error searching YouTube with yt-dlp:', error)
		return null
	}
}

/**
 * Check if yt-dlp is installed
 */
export const checkYtDlpInstalled = async (): Promise<boolean> => {
	try {
		await execAsync('yt-dlp --version')
		return true
	} catch {
		return false
	}
}
