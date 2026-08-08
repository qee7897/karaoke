const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8777;

// ====== YouTube Search ======
function searchYouTube(query) {
    return new Promise((resolve, reject) => {
        const searchData = JSON.stringify({
            context: {
                client: {
                    clientName: 'WEB',
                    clientVersion: '2.20240101.00.00',
                    hl: 'th',
                    gl: 'TH'
                }
            },
            query: query
        });

        const options = {
            hostname: 'www.youtube.com',
            path: '/youtubei/v1/search?key=AIzaSy…qcW8',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(searchData),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const contents = json.contents
                        ?.twoColumnSearchResultsRenderer
                        ?.primaryContents
                        ?.sectionListRenderer
                        ?.contents?.[0]
                        ?.itemSectionRenderer
                        ?.contents || [];

                    const videos = [];
                    for (const item of contents) {
                        const vr = item.videoRenderer;
                        if (!vr) continue;

                        const title = vr.title?.runs?.[0]?.text || '';
                        const channel = vr.ownerText?.runs?.[0]?.text || '';
                        const duration = vr.lengthText?.simpleText || '';
                        const thumbs = vr.thumbnail?.thumbnails || [];
                        const thumb = thumbs.length ? thumbs[thumbs.length - 1].url : '';

                        if (vr.videoId) {
                            videos.push({
                                id: vr.videoId,
                                title,
                                channel,
                                duration,
                                thumb: thumb.startsWith('http') ? thumb : `https://i.ytimg.com/vi/${vr.videoId}/mqdefault.jpg`
                            });
                        }
                    }
                    resolve(videos);
                } catch (e) {
                    reject(new Error('Parse error: ' + e.message));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
        req.write(searchData);
        req.end();
    });
}

// ====== Server ======
const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API
    if (parsed.pathname === '/api/search') {
        const query = parsed.query.q || '';
        if (!query) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'missing q' }));
            return;
        }

        try {
            const results = await searchYouTube(query);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ results }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    if (parsed.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // Static files
    let filePath = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };

    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(content);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`🎤 Karaoke Server running on port ${PORT}`);
});
