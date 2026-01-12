# ✨ Hocus-Focus 🪄

A lightweight Mozilla/Chrome browser extension that helps you stay focused while studying by minimizing distractions and reinforcing intentional browsing.

## Features

🎯 **Focus Timer** - Set customizable focus sessions (1-240 minutes) to stay on track with your studies

⭐ **Website Whitelist** - Create a list of allowed websites you can access during focus sessions

🚫 **Smart Blocking** - Automatically blocks non-whitelisted sites during active focus sessions

📚 **Study Detection** - Automatically detects and tags study-related websites (edu, Wikipedia, Khan Academy, etc.)

🎨 **Magic Theme** - Beautiful wizard-themed UI with purple gradients and glowing animations

💾 **Persistent Storage** - Your whitelist is saved across browser sessions using Chrome Sync Storage

🔔 **Session Notifications** - Get notified when your focus session completes

## Installation

### Chrome/Edge/Brave

1. Download or clone this repository
2. Open your browser and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `hocus-focus` folder
6. The extension is now installed! 🎉

### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `hocus-focus` folder
5. The extension is now installed! 🎉

## Usage

### Starting a Focus Session

1. Click the Hocus-Focus extension icon in your browser toolbar
2. Enter the duration in minutes (1-240)
3. Click "Start Focus" to begin your session
4. Only whitelisted sites will be accessible during the session

### Managing Your Whitelist

**Quick Add from Popup:**
- Visit the site you want to allow
- Click the extension icon
- Click "Add to Whitelist ⭐"

**Manage in Options:**
- Click "Manage Whitelist" in the popup, or
- Right-click the extension icon → Options
- Add domains manually (e.g., `wikipedia.org`)
- View all whitelisted sites
- Remove individual sites or clear all

### During a Session

If you try to visit a non-whitelisted site:
- A magical block page will appear
- You can add the site to your whitelist
- Or you can end the focus session early

## Permissions

The extension requires these permissions:
- `storage` - To save your whitelist and session data
- `alarms` - To track focus session duration
- `tabs` - To detect current page for quick-add feature
- `webNavigation` - To block non-whitelisted pages during sessions
- `<all_urls>` - To check and block pages across all websites

## Technical Details

- **Manifest Version**: V3 (latest standard)
- **Compatible**: Chrome, Edge, Brave, Firefox (with minor adaptations)
- **Storage**: Chrome Sync Storage (syncs across devices)
- **Architecture**: 
  - Background Service Worker for session management
  - Content Script for page blocking
  - Popup for quick controls
  - Options page for whitelist management

## Privacy

- All data is stored locally in your browser
- No data is sent to external servers
- Your whitelist syncs only via your browser's built-in sync (if enabled)
- No analytics or tracking

## Development

The extension consists of:
- `manifest.json` - Extension configuration
- `popup.html/js/css` - Main popup interface
- `options.html/js/css` - Options/settings page
- `background.js` - Service worker for session management
- `content.js` - Content script for blocking pages
- `icons/` - Extension icons

## License

MIT License - Feel free to use and modify!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ✨ magic ✨ to help you focus on what matters!
