Installation and usage
----------------------

1. Install a userscript manager such as Tampermonkey or Greasemonkey in your browser.
2. Open the file `reddit_limiter.user.js` from this repository in your editor or the browser.
3. Create a new userscript in your userscript manager and paste the contents of `reddit_limiter.user.js`, or use the manager's "Add from file" feature.
4. Reload Reddit (`https://www.reddit.com/` or `https://old.reddit.com/`). The script runs at page start.

Behavior
--------
- The script counts posts visible on the page (matching common Reddit post selectors) and prevents further network listing requests once 150 posts have been loaded. An overlay appears telling you to refresh to continue.
- Every 50th post (i.e. post 50, 100, 150, ...) will have its thumbnail image neutralized so it does not load.

Notes & limitations
-------------------
- Reddit's front-end and APIs change frequently. The script uses heuristics (DOM selectors and network URL patterns). It should work for common Reddit layouts but might need updates if Reddit changes their markup or network patterns.
- The script neutralizes thumbnails by replacing the `src` with a tiny 1x1 transparent GIF; this avoids loading the original image.
- Blocking is implemented by short-circuiting `fetch`/XHR requests that look like listing requests. That prevents the site from fetching more posts, but the console may show failed requests depending on Reddit internals.

If you want adjustments (e.g., different post limit, different thumbnail frequency, whitelist for certain subreddits), tell me which options you'd like and I can update the script.
