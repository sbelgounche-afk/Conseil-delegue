const http = require('http');

async function testApi() {
    console.log('--- Testing Admin Login ---');
    const loginData = JSON.stringify({
        username: 'admin',
        password: 'admin123'
    });

    const loginRes = await request('/api/auth/login', 'POST', loginData);
    console.log('Login Response:', loginRes);

    if (loginRes.token) {
        const token = loginRes.token;
        console.log('\n--- Testing Get Feed ---');
        const feedRes = await request('/api/posts/feed', 'GET', null, token);
        console.log('Feed Response (count):', Array.isArray(feedRes) ? feedRes.length : feedRes);

        console.log('\n--- Testing Create Post ---');
        const postData = JSON.stringify({
            caption: 'Test post from script',
            image: 'https://via.placeholder.com/150'
        });
        const postRes = await request('/api/posts', 'POST', postData, token);
        console.log('Create Post Response:', postRes);
    }
}

function request(path, method, data, token) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path,
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(body);
                }
            });
        });

        req.on('error', (e) => {
            resolve({ error: e.message });
        });

        if (data) {
            req.write(data);
        }
        req.end();
    });
}

testApi();
