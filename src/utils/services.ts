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
import latestVersion from 'latest-version'
import youtubeiPkg from 'youtubei.js/package.json' with { type: 'json' }
import { readFile } from 'fs/promises'
import path from 'path'

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

export const getVersion = () => youtubeiPkg.version

export const getLastVerion = async () => {
    return await latestVersion('youtubei.js')
}
