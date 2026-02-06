import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { Readable } from 'stream'
import { existsSync } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

/**
 * Get the cookies file path and check if it exists
 */
const getCookiesArgs = (): string[] => {
	const cookiesPath = path.resolve(process.cwd(), 'cookies.txt')
	if (existsSync(cookiesPath)) {
		console.log('Using cookies.txt file for yt-dlp')
		return ['--cookies', cookiesPath]
	}
	return []
}

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
	// Safety check for undefined or invalid IDs
	if (!id || id === 'undefined' || id === 'null') {
		console.log(`⚠️  Invalid video ID provided: ${id}`)
		return false
	}
	
	try {
		const url = `https://www.youtube.com/watch?v=${id}`
		const cookiesArgs = getCookiesArgs()
		
		const args = [
			'--dump-json',
			'--no-playlist',
			'--extractor-args', 'youtube:player_client=default,-android_sdkless',
			...cookiesArgs,
			url
		]
		
		const { stdout } = await execAsync(
			`yt-dlp ${args.map(arg => `"${arg}"`).join(' ')}`,
			{ timeout: 15000 } // 15 second timeout
		)
		
		const info = JSON.parse(stdout.trim())
		
		return {
			basic_info: {
				title: info.title || '',
				lengthSeconds: Number(info.duration || 0),
				thumbnails: info.thumbnails || [],
			},
		}
	} catch (err: any) {
		// Handle timeout and network errors gracefully
		if (err.killed && err.signal === 'SIGTERM') {
			console.log(`⚠️  Timeout fetching info for video ${id}`)
			return false
		}
		
		// Check for specific error types to reduce spam
		const stderr = err.stderr || ''
		if (stderr.includes('Video unavailable') || 
			stderr.includes('Private video') || 
			stderr.includes('has been terminated') ||
			stderr.includes('This video is not available')) {
			console.log(`⚠️  Video ${id} is unavailable (${stderr.includes('Private') ? 'private' : 'deleted/terminated'})`)
			return false
		}
		
		// Handle network errors without spamming logs
		if (err.message?.includes('Connect Timeout Error') ||
			err.code === 'ETIMEDOUT' ||
			err.code === 'ECONNRESET' ||
			err.code === 'ENOTFOUND') {
			console.log(`⚠️  Network error fetching info for video ${id}`)
			return false
		}
		
		// Log other errors normally but less verbosely
		console.error(`Error fetching YT info for ${id}:`, err.message)
		return false
	}
}

/**
 * Get audio stream using yt-dlp
 */
export const getAudioStream = async (id: string): Promise<Readable> => {
	const url = `https://www.youtube.com/watch?v=${id}`
	const cookiesArgs = getCookiesArgs()
	
	// Use yt-dlp to get the best audio format URL with options for long streams
	const args = [
		'--format', 'bestaudio/best',
		'--output', '-',
		'--quiet',
		'--no-playlist',
		'--extractor-args', 'youtube:player_client=default,-android_sdkless',
		'--buffer-size', '16K', // Smaller buffer to reduce memory usage
		'--no-part', // Don't create .part files
		'--retries', '3', // Retry failed downloads
		'--fragment-retries', '3', // Retry failed fragments
		...cookiesArgs,
		url
	]
	
	const ytdlp = spawn('yt-dlp', args, {
		stdio: ['ignore', 'pipe', 'pipe'],
		// Don't set a timeout on the spawn process itself for long videos
	})

	if (!ytdlp.stdout) {
		throw new Error('Failed to create yt-dlp audio stream')
	}

	// Handle errors - filter out harmless broken pipe errors
	ytdlp.stderr?.on('data', (data) => {
		const errorMessage = data.toString().trim()
		// Filter out harmless broken pipe errors that occur during normal operation
		if (errorMessage && 
			!errorMessage.includes('Broken pipe') && 
			!errorMessage.includes('unable to write data') &&
			!errorMessage.includes('[Errno 32]') &&
			!errorMessage.includes('fragment retries')) {
			console.error('yt-dlp stderr:', errorMessage)
		}
	})

	ytdlp.on('error', (error) => {
		// Only log non-EPIPE errors as they're the only ones that matter
		if (!error.message.includes('EPIPE') && !error.message.includes('Broken pipe')) {
			console.error('yt-dlp process error:', error)
		}
	})

	// Handle process exit
	ytdlp.on('exit', (code, signal) => {
		if (code !== 0 && code !== null && signal !== 'SIGTERM') {
			console.log(`⚠️  yt-dlp process exited with code ${code} for video ${id}`)
		}
	})

	return ytdlp.stdout
}

/**
 * Get playlist information using yt-dlp
 */
export const getYtPlaylistInfo = async (playlistId: string): Promise<{ title: string } | false> => {
	try {
		const url = `https://www.youtube.com/playlist?list=${playlistId}`
		const cookiesArgs = getCookiesArgs()
		
		const args = [
			'--dump-json',
			'--no-warnings',
			'--playlist-end', '1', // Only get first item to extract playlist info
			'--extractor-args', 'youtube:player_client=default,-android_sdkless',
			...cookiesArgs,
			url
		]
		
		const { stdout } = await execAsync(
			`yt-dlp ${args.map(arg => `"${arg}"`).join(' ')}`,
			{ 
				timeout: 15000 // 15 second timeout
			}
		)
		
		const lines = stdout.trim().split('\n').filter(line => line.trim())
		if (lines.length > 0) {
			try {
				const info = JSON.parse(lines[0])
				return {
					title: info.playlist_title || info.uploader || 'Unknown Playlist'
				}
			} catch (e) {
				return false
			}
		}
		
		return false
	} catch (error: any) {
		console.log(`⚠️  Failed to get playlist info for ${playlistId}:`, error.message)
		return false
	}
}

/**
 * Get playlist video IDs using yt-dlp
 */
export const getYtPlaylistIds = async (playlistId: string): Promise<string[] | false> => {
	try {
		const url = `https://www.youtube.com/playlist?list=${playlistId}`
		const cookiesArgs = getCookiesArgs()
		
		const args = [
			'--flat-playlist',
			'--dump-json',
			'--no-warnings',
			'--extractor-args', 'youtube:player_client=default,-android_sdkless',
			...cookiesArgs,
			url
		]
		
		const { stdout } = await execAsync(
			`yt-dlp ${args.map(arg => `"${arg}"`).join(' ')}`,
			{ 
				maxBuffer: 200 * 1024 * 1024, // 200MB buffer for large playlists
				timeout: 30000 // 30 second timeout for playlists
			}
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
	} catch (error: any) {
		// Handle timeout and network errors gracefully
		if (error.killed && error.signal === 'SIGTERM') {
			console.log(`⚠️  Timeout fetching playlist ${playlistId}`)
			return false
		}
		
		if (error.message?.includes('Connect Timeout Error') ||
			error.code === 'ETIMEDOUT' ||
			error.code === 'ECONNRESET' ||
			error.code === 'ENOTFOUND') {
			console.log(`⚠️  Network error fetching playlist ${playlistId}`)
			return false
		}
		
		console.error('Error fetching playlist video IDs with yt-dlp:', error)
		return false
	}
}

/**
 * Search for videos using yt-dlp
 */
export const searchYoutube = async (query: string): Promise<any> => {
	try {
		const cookiesArgs = getCookiesArgs()
		
		const args = [
			`ytsearch:${query}`,
			'--dump-json',
			'--no-playlist',
			'--max-downloads', '1',
			'--extractor-args', 'youtube:player_client=default,-android_sdkless',
			...cookiesArgs
		]
		
		const { stdout, stderr } = await execAsync(
			`yt-dlp ${args.map(arg => `"${arg}"`).join(' ')}`,
			{ timeout: 20000 } // 20 second timeout for searches
		)
		
		const info = JSON.parse(stdout.trim())
		return {
			videoDetails: {
				videoId: info.id,
				title: info.title,
				lengthSeconds: info.duration,
			}
		}
	} catch (error: any) {
		// Handle timeout and network errors gracefully
		if (error.killed && error.signal === 'SIGTERM') {
			console.log(`⚠️  Timeout searching for: ${query}`)
			return null
		}
		
		if (error.message?.includes('Connect Timeout Error') ||
			error.code === 'ETIMEDOUT' ||
			error.code === 'ECONNRESET' ||
			error.code === 'ENOTFOUND') {
			console.log(`⚠️  Network error searching for: ${query}`)
			return null
		}
		
		// yt-dlp sometimes exits with code 101 even on successful searches
		// Check if there's valid JSON output in the error
		if (error.stdout && error.stdout.trim()) {
			try {
				const info = JSON.parse(error.stdout.trim())
				return {
					videoDetails: {
						videoId: info.id,
						title: info.title,
						lengthSeconds: info.duration,
					}
				}
			} catch (parseError) {
				console.error('Error parsing yt-dlp search JSON:', parseError)
			}
		}
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
