/* Where the settings API runs.
 *
 * Leave this empty while testing locally: the management page will ask for the
 * bot's address once and remember it in that browser.
 *
 * After the bot is hosted, put its public HTTPS address here, for example:
 *   window.KERNEL_API_BASE = 'https://kernel-api.wispbyte.app';
 * No trailing slash, no /api suffix.
 */
window.KERNEL_API_BASE = 'https://almanac-carbon-babied.ngrok-free.dev';

/* Optional: where the status page should read the uptime probe file from. On a github.io site
 * the page already finds it in the repository, so this is only needed for another host.
 *   window.KERNEL_UPTIME_URL = 'https://example.com/uptime.json';
 */
