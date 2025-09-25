Discord permissions INT = 277028653056

---

Enable Message content intent

---

## Prerequisites

Install yt-dlp on your system:

**Linux/macOS:**
```bash
pip3 install yt-dlp
# or using homebrew on macOS
brew install yt-dlp
```

**Windows:**
```bash
pip install yt-dlp
# or download from https://github.com/yt-dlp/yt-dlp/releases
```

---

## YouTube Data API (Required for Search Command)

To use the `/search` command with real-time autocomplete, you need a YouTube Data API v3 key:

1. **Get API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Enable "YouTube Data API v3"
   - Create credentials (API Key)
   - Restrict the key to YouTube Data API v3

2. **Set Environment Variable:**
   ```bash
   export GOOGLE_API_KEY=your_api_key_here
   ```

3. **Add to your environment file:**
   ```bash
   GOOGLE_API_KEY=your_api_key_here
   ```

**Note:** The search command will be disabled if no API key is provided. Other commands will continue to work normally.

---

## YouTube Cookies (Optional)

For accessing age-restricted content or improving reliability, you can provide YouTube cookies:

1. **For yt-dlp**: Drop your cookies in `cookies.txt` format at the root directory
2. **Legacy**: The old `cookies.json` format is no longer used

### How to export cookies:

**Method 1: Browser Extension**
- Install a cookie exporter extension (e.g., "Get cookies.txt LOCALLY")
- Visit YouTube and login
- Export cookies in Netscape format as `cookies.txt`

**Method 2: Manual Export** 
- Use browser developer tools to copy cookies
- Format them properly for yt-dlp

The bot will automatically detect and use `cookies.txt` if present.