(function () {
    const cloudflareWebAnalytics = {
        // Paste the public Cloudflare Web Analytics token from the dashboard snippet.
        token: '27d42618c53846ada3300ce4fefe0f94',
        hostnames: ['simoncos.github.io']
    };

    const currentScript = document.currentScript;
    const scriptToken = currentScript ? currentScript.getAttribute('data-cf-token') || '' : '';
    const scriptHostnames = currentScript ? currentScript.getAttribute('data-cf-hostnames') || '' : '';
    const token = (scriptToken || cloudflareWebAnalytics.token || '').trim();

    if (!token || token === 'CLOUDFLARE_WEB_ANALYTICS_TOKEN') {
        return;
    }

    const allowedHostnames = scriptHostnames
        ? scriptHostnames.split(',').map(function (hostname) {
            return hostname.trim();
        }).filter(Boolean)
        : cloudflareWebAnalytics.hostnames;

    if (allowedHostnames.length > 0 && !allowedHostnames.includes(window.location.hostname)) {
        return;
    }

    if (document.querySelector('script[data-cf-beacon]')) {
        return;
    }

    const beacon = document.createElement('script');
    beacon.defer = true;
    beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    beacon.setAttribute('data-cf-beacon', JSON.stringify({ token: token }));

    const target = document.body || document.head || document.documentElement;
    target.appendChild(beacon);
})();
