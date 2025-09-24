// Keeping Cookie type local to avoid ytdl-core import
export type Cookie = {
    domain?: string
    expirationDate?: number
    hostOnly?: boolean
    httpOnly?: boolean
    name: string
    path?: string
    sameSite?: string
    secure?: boolean
    session?: boolean
    storeId?: string
    value: string
    id?: number
}
import { readFile } from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const identifyService = (url: string): 'spotify' | 'youtube' => {
	if (url.includes('spotify')) return 'spotify'

	return 'youtube'
}

export const getCookies = async (): Promise<string> => {
    try {
        const filePath = path.resolve(process.cwd(), 'cookie.txt')
        const content = await readFile(filePath, 'utf8')
        return content.trim()
    } catch (err) {
        console.info('No cookie.txt file present')
        return ''
    }
}

export const getVersion = async (): Promise<string> => {
    try {
        const { stdout } = await execAsync('yt-dlp --version')
        return stdout.trim()
    } catch {
        return 'yt-dlp not installed'
    }
}

export const getLastVerion = async (): Promise<string> => {
    try {
        // Get latest yt-dlp version from GitHub releases
        const { stdout } = await execAsync('curl -s https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest | grep "tag_name" | cut -d\'"\'"\' -f4')
        return stdout.trim()
    } catch {
        return 'unknown'
    }
}
