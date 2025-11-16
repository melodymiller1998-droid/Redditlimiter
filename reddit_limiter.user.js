// ==UserScript==
// @name        Reddit Limiter
// @namespace   https://github.com/melodymiller1998-droid/Redditlimiter
// @version     1.0
// @description Stops Reddit from loading more than 150 posts per page load and skips thumbnails for 1 in every 50 posts.
// @match       https://www.reddit.com/*
// @match       https://old.reddit.com/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

(function () {
  'use strict';

  const MAX_POSTS = 150;
  let postCount = 0;
  let limitReached = false;

  // Small helper to show overlay when limit is reached
  function showLimitOverlay() {
    try {
      if (document.getElementById('reddit-limiter-overlay')) return;
      const ov = document.createElement('div');
      ov.id = 'reddit-limiter-overlay';
      Object.assign(ov.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 2147483647,
        background: '#ff4500',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '6px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        boxShadow: '0 2px 6px rgba(0,0,0,.3)'
      });
      ov.textContent = `Reddit Limiter: ${MAX_POSTS} posts loaded — refresh to continue.`;
      document.documentElement.appendChild(ov);
    } catch (e) {
      // ignore
    }
  }

  // Intercept fetch calls and return a harmless empty listing when limit reached
  (function interceptFetch() {
    try {
      const origFetch = window.fetch.bind(window);
      window.fetch = function (input, init) {
        try {
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          if (!limitReached && postCount >= MAX_POSTS) {
            limitReached = true;
            showLimitOverlay();
          }
          if (limitReached && url && isRedditListingRequest(url)) {
            const body = JSON.stringify({ data: { children: [] } });
            return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }));
          }
        } catch (err) {
          // swallow
        }
        return origFetch(input, init);
      };
    } catch (e) {
      // not fatal
    }
  })();

  // Patch XHR open/send to block listing requests when limit reached
  (function interceptXHR() {
    try {
      const proto = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
      if (!proto) return;
      const origOpen = proto.open;
      const origSend = proto.send;
      proto.open = function (method, url) {
        this._rl_url = url;
        return origOpen.apply(this, arguments);
      };
      proto.send = function (body) {
        try {
          if (!limitReached && postCount >= MAX_POSTS) {
            limitReached = true;
            showLimitOverlay();
          }
          if (limitReached && this._rl_url && isRedditListingRequest(this._rl_url)) {
            try { this.abort(); } catch (e) {}
            return;
          }
        } catch (e) {
          // swallow
        }
        return origSend.apply(this, arguments);
      };
    } catch (e) {
      // ignore
    }
  })();

  // Simple heuristic to detect reddit listing/network calls we want to block
  function isRedditListingRequest(url) {
    if (!url) return false;
    try {
      const u = url.toLowerCase();
      // block common listing endpoints (json endpoints, graphql, api listing patterns, or requests carrying an "after" cursor)
      return (
        u.includes('/.json') ||
        u.includes('gql.reddit.com') ||
        u.includes('/api/') ||
        u.includes('?after=') ||
        u.includes('&after=')
      );
    } catch (e) {
      return false;
    }
  }

  // Process a discovered post element: increment counter and optionally remove thumbnail
  function processPost(el) {
    try {
      if (!el || el._rl_processed) return;
      el._rl_processed = true;

      postCount++;

      // For 1 in every 50 posts, remove the thumbnail (use every 50th: index % 50 === 0)
      if (postCount % 50 === 0) {
        // find the most likely thumbnail image inside the post and neutralize it
        const imgs = el.querySelectorAll('img');
        for (const img of imgs) {
          // skip tiny UI icons (heuristic: image with width >= 32 or src containing common preview domains)
          try {
            const src = (img.src || '').toLowerCase();
            const width = img.naturalWidth || img.width || 0;
            if (src && (src.includes('preview.redd.it') || src.includes('external-preview') || src.includes('thumb') || width >= 32)) {
              img.dataset._rl_blocked = '1';
              img.removeAttribute('srcset');
              img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; // 1x1 transparent gif
              img.style.opacity = '0.6';
              break;
            }
          } catch (e) {
            // continue
          }
        }
      }

      if (!limitReached && postCount >= MAX_POSTS) {
        limitReached = true;
        showLimitOverlay();
      }
    } catch (e) {
      // swallow
    }
  }

  // Start observing for posts when DOM is available
  function startObserver() {
    try {
      const postSelector = 'div[data-testid="post-container"], article[data-testid="post"], div.Post, div.scrollerItem';

      // initial scan
      try {
        document.querySelectorAll(postSelector).forEach(processPost);
      } catch (e) {}

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (!(node instanceof Element)) continue;
            // if the added node itself is a post
            if (node.matches && node.matches(postSelector)) {
              processPost(node);
            }
            // or it contains posts
            try {
              node.querySelectorAll && node.querySelectorAll(postSelector).forEach(processPost);
            } catch (e) {}
          }
        }
      });

      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) {
      // ignore
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }

})();
