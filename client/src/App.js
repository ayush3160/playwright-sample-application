import React, { useState, useCallback } from 'react';
import './App.css';

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

// Generate random headers
const generateRandomHeaders = (contentType) => {
    const headers = {
        'Content-Type': contentType,
    };

    if (Math.random() > 0.5) {
        headers['Authorization'] = `Bearer ${generateRandomString(32)}`;
    }

    if (Math.random() > 0.5) {
        headers['Cookie'] = `sessionId=${generateRandomString(24)}; userId=${Math.floor(Math.random() * 1000)}`;
    }
    
    if (Math.random() > 0.3) {
        headers['X-Custom-Header'] = generateRandomString(20);
    }

    return headers;
}


function App() {
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [requestCount, setRequestCount] = useState(500);

  const sendRequests = useCallback(async () => {
    setSending(true);
    setLogs([]);
    const ports = [3000, 3001, 3002, 3003, 3004];
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const contentType = 'application/json'; // Always use application/json

    for (let i = 0; i < requestCount; i++) {
      const port = ports[Math.floor(Math.random() * ports.length)];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const headers = generateRandomHeaders(contentType);
      const body = (method !== 'GET' && method !== 'DELETE') ? generateRandomBody(contentType) : undefined;
      const url = `http://localhost:${port}/${Math.random().toString(36).substring(7)}`;
      
      const newLog = `(${i + 1}/${requestCount}) Sending ${method} to ${url}`;
      setLogs(prevLogs => [newLog, ...prevLogs]);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
        });
        await response.text();
        const successLog = `(${i + 1}/${requestCount}) Response from ${url}: ${response.status}`;
        setLogs(prevLogs => [successLog, ...prevLogs.slice(1)]);
      } catch (error) {
        const errorLog = `(${i + 1}/${requestCount}) Error sending request to ${url}: ${error.message}`;
        setLogs(prevLogs => [errorLog, ...prevLogs.slice(1)]);
      }
    }

    setSending(false);
  }, [requestCount]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Request Sender</h1>
        <div>
          <label>
            Number of requests:
            <input
              type="number"
              id="request-count"
              value={requestCount}
              onChange={(e) => setRequestCount(parseInt(e.target.value, 10))}
              disabled={sending}
            />
          </label>
        </div>
        <button onClick={sendRequests} id="send-requests-button" disabled={sending}>
          {sending ? 'Sending...' : 'Send Requests'}
        </button>
        <div className="logs">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;
