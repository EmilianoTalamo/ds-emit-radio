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