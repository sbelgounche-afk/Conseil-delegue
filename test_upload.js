const http = require('http');
const fs = require('fs');
const path = require('path');

async function testUpload() {
    const loginData = JSON.stringify({
        username: 'admin',
        password: 'admin123'
    });

    const loginRes = await request('/api/auth/login', 'POST', loginData);
    const token = loginRes.token;

    if (!token) {
        console.error('Login failed');
        return;
    }

    console.log('--- Testing File Upload ---');
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const filePath = path.join(__dirname, 'index.html'); // Just use a file that exists
    const fileContent = fs.readFileSync(filePath);

    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="image"; filename="test.html"\r\n`;
    body += `Content-Type: text/html\r\n\r\n`;

    const footer = `\r\n--${boundary}--\r\n`;

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/posts',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        }
    };

    const req = http.request(options, (res) => {
        let resBody = '';
        res.on('data', (chunk) => resBody += chunk);
        res.on('end', () => {
            console.log('Upload Response Status:', res.statusCode);
            console.log('Upload Response Body:', resBody);
        });
    });

    req.on('error', (e) => console.error(e));

    req.write(body);
    req.write(fileContent);
    req.write(footer);
    req.end();
}

function request(path, method, data) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost', port: 3000, path, method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.write(data);
        req.end();
    });
}

testUpload();
