const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const onFinished = require("on-finished");

const ports = [3000, 3001, 3002, 3003, 3004];
const logFilePath = path.resolve(__dirname, "../access.log.jsonl");   // JSON-Lines
const logStream   = fs.createWriteStream(logFilePath, { flags: "a" });

// Initialize log file with an empty array
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, '');
}

// Helper to generate random strings
const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// More varied random body generation
const generateRandomBody = (contentType) => {
  const size = Math.floor(Math.random() * 1024 * 10); // up to 10KB
  if (contentType === 'application/json') {
    const depth = Math.floor(Math.random() * 3) + 1;
    const randomObject = (d) => {
      if (d === 0) return generateRandomString(10);
      const obj = {};
      const keys = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < keys; i++) {
        obj[generateRandomString(5)] = Math.random() > 0.5 ? generateRandomString(15) : randomObject(d - 1);
      }
      return obj;
    }
    return JSON.stringify(randomObject(depth));
  }
  if (contentType === 'text/plain') {
    return generateRandomString(size);
  }
  if (contentType === 'application/octet-stream') {
    const buffer = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  }
  return generateRandomString(size);
};

const app = express();

// Middleware to handle raw body, assuming content-type will be varied
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.raw({ type: "*/*", limit: "50mb" }));

function logRequestAndResponse(req, res, next) {
  const chunks = [];
  const append = chunk =>
    chunk && chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

  // Proxy res.write / res.end so we can see the body
  const origWrite = res.write.bind(res);
  const origEnd   = res.end.bind(res);

  res.write = (...args) => { append(args[0]); return origWrite(...args); };
  res.end   = (...args) => { append(args[0]); return origEnd  (...args); };

  // When the response is completely flushed
  onFinished(res, () => {
    const entry = {
      timestamp: new Date().toISOString(),
      request : {
        port   : req.socket.localPort,
        method : req.method,
        url    : req.originalUrl,
        headers: req.headers,
        body   : req.body,
      },
      response: {
        statusCode: res.statusCode,
        headers   : res.getHeaders(),
        body      : Buffer.concat(chunks).toString("utf8"),
      },
    };

    try {
      // One object per line ⇒ no shared mutable state ⇒ no JSON corruption
      logStream.write(`${JSON.stringify(entry)}\n`);
    } catch (err) {
      console.error("Failed to write log entry:", err);
    }
  });

  next();
}

app.use(logRequestAndResponse);

const randomResponse = (req, res) => {
  const responses = [
    { status: 200, body: { message: "Success!" } },
    { status: 201, body: { message: "Created" } },
    { status: 202, body: { message: "Accepted" } },
    // { status: 204, body: null }, // No content
    { status: 400, body: { error: "Bad Request" } },
    { status: 401, body: { error: "Unauthorized" } },
    { status: 403, body: { error: "Forbidden" } },
    { status: 404, body: { error: "Not Found" } },
    { status: 500, body: { error: "Internal Server Error" } },
    { status: 503, body: { error: "Service Unavailable" } },
  ];

  let { status, body } =
    responses[Math.floor(Math.random() * responses.length)];

    res.setHeader("Content-Type", "application/json");

    body = generateRandomBody("application/json");

  res.status(status);
  if (body) {
    res.json(body);
  } else {
    res.send();
  }
};

app.all("*", randomResponse);

ports.forEach((port) => {
  const server = express();
  server.use(app); // Use the main app logic for each server instance
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
