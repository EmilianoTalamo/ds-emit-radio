import ytdl, { Cookie } from '@distube/ytdl-core'
import ytdlCore from '@ybd-project/ytdl-core/package.json'
import latestVersion from 'latest-version'
// import cookies from '~/cookies.json'

export const identifyService = (url: string): 'spotify' | 'youtube' => {
	if (url.includes('spotify')) return 'spotify'

	return 'youtube'
}

export const getCookies = async (): Promise<Cookie[]> => {
	try {
		const cookies: Cookie[] = (await import('cookies.json')).default
		return cookies
	}
	catch (err) {
		console.info('No cookies file present')
		return []
	}
}

export const getVersion = () => ytdlCore.version

export const getLastVerion = async () => {
	return await latestVersion('@ybd-project/ytdl-core')
}
