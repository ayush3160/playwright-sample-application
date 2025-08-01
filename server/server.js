const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const ports = [3000, 3001, 3002, 3003, 3004];
const logFilePath = path.join(__dirname, '../req-res.json');

// Initialize log file with an empty array
if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, JSON.stringify([], null, 2));
}

const app = express();

// Middleware to handle raw body, assuming content-type will be varied
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));


const logRequestAndResponse = (req, res, next) => {
    const oldWrite = res.write;
    const oldEnd = res.end;

    const chunks = [];

    res.write = (...restArgs) => {
        chunks.push(Buffer.from(restArgs[0]));
        oldWrite.apply(res, restArgs);
    };

    res.end = (...restArgs) => {
        if (restArgs[0]) {
            chunks.push(Buffer.from(restArgs[0]));
        }
        const responseBody = Buffer.concat(chunks).toString('utf8');

        const logData = {
            timestamp: new Date().toISOString(),
            request: {
                port: req.socket.localPort,
                method: req.method,
                url: req.originalUrl,
                headers: req.headers,
                body: req.body.toString('utf8'),
            },
            response: {
                statusCode: res.statusCode,
                headers: res.getHeaders(),
                body: responseBody,
            },
        };

        fs.readFile(logFilePath, (err, data) => {
            let logs = [];
            if (!err && data.length > 0) {
                try {
                    logs = JSON.parse(data);
                } catch (e) {
                    console.error('Error parsing log file, re-initializing.', e);
                    logs = [];
                }
            }
            logs.push(logData);
            fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), (err) => {
                if (err) {
                    console.error('Failed to write to log file:', err);
                }
            });
        });

        oldEnd.apply(res, restArgs);
    };

    next();
};

app.use(logRequestAndResponse);

const randomResponse = (req, res) => {
    const responses = [
        { status: 200, body: { message: 'Success!' } },
        { status: 201, body: { message: 'Created' } },
        { status: 202, body: { message: 'Accepted' } },
        // { status: 204, body: null }, // No content
        { status: 400, body: { error: 'Bad Request' } },
        { status: 401, body: { error: 'Unauthorized' } },
        { status: 403, body: { error: 'Forbidden' } },
        { status: 404, body: { error: 'Not Found' } },
        { status: 500, body: { error: 'Internal Server Error' } },
        { status: 503, body: { error: 'Service Unavailable' } }
    ];
    
    const { status, body } = responses[Math.floor(Math.random() * responses.length)];
    
    res.status(status);
    if (body) {
        res.json(body);
    } else {
        res.send();
    }
};

app.all('*', randomResponse);

ports.forEach(port => {
    const server = express();
    server.use(app); // Use the main app logic for each server instance
    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
});
