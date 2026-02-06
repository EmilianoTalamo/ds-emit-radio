import { Readable } from 'stream'
import { spawn } from 'child_process'

/**
 * Validate if a URL is a valid stream URL (basic URL validation)
 */
export const isValidStreamUrl = (url: string): boolean => {
	try {
		const urlObj = new URL(url)
		const protocol = urlObj.protocol.toLowerCase()
		
		// Allow http, https protocols
		return ['http:', 'https:'].includes(protocol)
	} catch (error) {
		return false
	}
}

/**
 * Get stream information (basic validation)
 */
export const getStreamInfo = async (url: string): Promise<{ title: string; url: string } | false> => {
	if (!isValidStreamUrl(url)) {
		return false
	}
	
	try {
		// Include the URL in the title for identification
		// In the future, this could be enhanced to fetch actual stream metadata
		return {
			title: `Radio stream (${url})`,
			url: url
		}
	} catch (error) {
		console.error('Error validating stream:', error)
		return false
	}
}

/**
 * Create an audio stream from a URL using ffmpeg
 */
export const getStreamAudio = async (url: string): Promise<Readable> => {
	// Use ffmpeg to handle various stream formats and convert to a format Discord can use
	const ffmpeg = spawn('ffmpeg', [
		'-i', url,
		'-f', 'mp3',
		'-acodec', 'libmp3lame',
		'-ab', '128k',
		'-ar', '48000',
		'-ac', '2',
		'-reconnect', '1',
		'-reconnect_streamed', '1',
		'-reconnect_delay_max', '5',
		'-loglevel', 'warning',
		'-'
	], {
		stdio: ['ignore', 'pipe', 'pipe']
	})

	if (!ffmpeg.stdout) {
		throw new Error('Failed to create stream audio process')
	}

	// Handle errors
	ffmpeg.stderr?.on('data', (data) => {
		const errorMessage = data.toString().trim()
		// Only log significant errors, filter out common ffmpeg warnings
		if (errorMessage && 
			!errorMessage.includes('deprecated') && 
			!errorMessage.includes('Application provided invalid')) {
			console.error('ffmpeg stderr:', errorMessage)
		}
	})

	ffmpeg.on('error', (error) => {
		console.error('ffmpeg process error:', error)
	})

	ffmpeg.on('exit', (code, signal) => {
		if (code !== 0 && code !== null && signal !== 'SIGTERM') {
			console.log(`⚠️  ffmpeg process exited with code ${code} for stream ${url}`)
		}
	})

	return ffmpeg.stdout
}

/**
 * Check if ffmpeg is installed
 */
export const checkFfmpegInstalled = async (): Promise<boolean> => {
	return new Promise((resolve) => {
		const ffmpeg = spawn('ffmpeg', ['-version'], { stdio: 'ignore' })
		ffmpeg.on('close', (code) => {
			resolve(code === 0)
		})
		ffmpeg.on('error', () => {
			resolve(false)
		})
	})
}