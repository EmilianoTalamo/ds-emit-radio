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
 * Generate a readable title from a stream URL
 */
const generateTitleFromUrl = (url: string): string => {
	try {
		const urlObj = new URL(url)
		
		// Get the pathname without leading slash
		let path = urlObj.pathname.replace(/^\/+/, '')
		
		// Remove file extension if present
		path = path.replace(/\.[^.]+$/, '')
		
		// If no meaningful path, use hostname
		if (!path || path === '') {
			return urlObj.hostname
		}
		
		// Replace slashes and underscores with spaces, capitalize words
		const title = path
			.replace(/[/_-]/g, ' ')
			.split(' ')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ')
		
		return title || urlObj.hostname
	} catch (error) {
		// Fallback: return trimmed URL
		return url.length > 100 ? url.substring(0, 97) + '...' : url
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
		// Generate a readable title from the URL
		const title = generateTitleFromUrl(url)
		
		return {
			title: title,
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
		'-reconnect_at_eof', '1',
		'-multiple_requests', '1',
		'-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
		'-loglevel', 'error', // Reduce log verbosity
		'-'
	], {
		stdio: ['ignore', 'pipe', 'pipe']
	})

	if (!ffmpeg.stdout) {
		throw new Error('Failed to create stream audio process')
	}

	// Handle errors more gracefully
	ffmpeg.stderr?.on('data', (data) => {
		const errorMessage = data.toString().trim()
		// Filter out common harmless errors that occur during normal streaming
		if (errorMessage && 
			!errorMessage.includes('deprecated') && 
			!errorMessage.includes('Application provided invalid') &&
			!errorMessage.includes('Broken pipe') &&
			!errorMessage.includes('av_interleaved_write_frame') &&
			!errorMessage.includes('Error writing trailer') &&
			!errorMessage.includes('Error closing file') &&
			!errorMessage.includes('Last message repeated')) {
			console.error('ffmpeg stderr:', errorMessage)
		}
	})

	ffmpeg.on('error', (error) => {
		// Only log non-EPIPE errors as they're the only ones that matter
		if (!error.message.includes('EPIPE') && !error.message.includes('Broken pipe')) {
			console.error('ffmpeg process error:', error)
		}
	})

	ffmpeg.on('exit', (code, signal) => {
		// Don't log broken pipe exits as errors - they're normal when streams end
		if (code !== 0 && code !== null && signal !== 'SIGTERM' && code !== 1) {
			console.log(`⚠️  ffmpeg process exited with code ${code} for stream ${url}`)
		}
	})

	// Handle stdout errors to prevent crashes
	ffmpeg.stdout.on('error', (error) => {
		if (!error.message.includes('EPIPE') && !error.message.includes('Broken pipe')) {
			console.error('ffmpeg stdout error:', error)
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