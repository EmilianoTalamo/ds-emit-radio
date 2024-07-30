export const identifyService = (url: string): 'spotify' | 'youtube' => {
	if(url.includes('spotify'))
		return 'spotify'

	return 'youtube'
}