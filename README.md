```
# ⚙️ HTTP/1.1 Server from Scratch (Node.js + TCP)
```

## 🔍 What This Project Is

This project is a **from-scratch HTTP/1.1 server** built in **Node.js** using only the **`net` TCP module**.  
There is **no `http.createServer`**, no Express, and **no HTTP parsing or routing libraries**.  
Every HTTP request and response is manually handled over raw TCP sockets. [web:38][web:41]

This is designed to **understand HTTP deeply**:

- What does a raw HTTP request actually look like?
- How does the server know it’s `GET` vs `POST`?
- How are headers and body separated?
- How is `Content-Length` used to read the body?
- How does HTTP sit on top of TCP? [web:36]

---

## 🚀 Getting Started

### ✅ Prerequisites

- [Node.js](https://nodejs.org/) installed (`node -v` to verify) [web:46]
- (Optional) Git for version control

### 📁 Clone & Enter Project

```
git clone <your-repo-url>
cd HTTP-TASK   # or your folder name
```

### ▶️ Run the Server

```
# Default port 8080
node server.js

# Or a custom port
node server.js 3000
```

You should see:

```
Raw HTTP/1.1 Server listening on port 8080
Test with: curl http://localhost:8080/
```

Keep this terminal open; the server runs here.

---

## 🌐 Available Endpoints

All endpoints use **HTTP/1.1 over raw TCP**.

### 1. `GET /` – Welcome

Returns a simple welcome message.

- **Status**: `200 OK`
- **Content-Type**: `text/plain`

```
curl http://localhost:8080/
```

---

### 2. `GET /echo?message=...` – Echo

Echoes back whatever you pass in the `message` query parameter.

- **Status**: `200 OK`
- **Content-Type**: `text/plain`

```
curl "http://localhost:8080/echo?message=hello"
# → hello
```

---

### 3. `POST /data` – Store JSON in Memory

Accepts a JSON body, stores it in memory with an auto-incremented `id`, and returns that `id`.

- **Required Header**: `Content-Type: application/json`
- **Status**: `200 OK`
- **Content-Type**: `application/json`
- **Body Example**:

```
{"success": true, "id": 1}
```

**Windows PowerShell (recommended):**

```
$body = @{name="test"; value=123} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/data" -Method POST -Body $body -ContentType "application/json"
```

**curl.exe (PowerShell / CMD):**

```
curl.exe -X POST http://localhost:8080/data -H "Content-Type: application/json" -d "{\"name\":\"test\",\"value\":123}"
```

---

### 4. `GET /data` – Get All Stored Items

Returns an array of all stored JSON objects.

- **Status**: `200 OK`
- **Content-Type**: `application/json`

Example response:

```
[
  {"id":1,"name":"test","value":123},
  {"id":2,"name":"another","value":456}
]
```

```
curl http://localhost:8080/data
```

---

### 5. `GET /data/:id` – Get Single Item by ID

Returns a single stored object by numeric `id`.

- **On success**:
  - **Status**: `200 OK`
  - **Body**:
    ```
    {"id":1,"name":"test","value":123}
    ```
- **If not found**:
  - **Status**: `404 Not Found`
  - **Body**: `Item not found`

```
curl http://localhost:8080/data/1
curl http://localhost:8080/data/999   # → 404
```

---

## 🧠 How HTTP Is Handled Internally

### 📨 Request Parsing (Manual)

The server reads **raw bytes** from the TCP socket and:

1. Finds the **request line**:  
   `METHOD PATH HTTP/1.1`  
   e.g. `GET /data HTTP/1.1` [web:38]
2. Reads headers line by line until it hits a blank line (`\r\n\r\n`).
3. Stores headers in a lowercase-key map (`host`, `content-length`, `content-type`, etc.).
4. Uses `Content-Length` to know exactly how many bytes of **body** to read for POST. [web:36]
5. Splits `PATH` and query string to handle `/echo?message=...`.

This is all done manually with strings and buffers—no HTTP helpers.

### 📨 Response Formatting (Manual)

Every response is hand-built like this:

```
HTTP/1.1 <status-code> <reason-phrase>\r\n
Header-Name: value\r\n
Another-Header: value\r\n
...\r\n
\r\n
<body>
```

For example:

```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 27
Date: Mon, 01 Dec 2025 18:00:00 GMT
Connection: close

{"success":true,"id":1}
```

Headers are calculated manually, including `Content-Length` based on the body size.

---

## 🛡️ Error Handling

The server handles several common cases:

- **400 Bad Request**
  - Invalid JSON in `POST /data`
  - Incorrect or missing `Content-Type: application/json`
- **404 Not Found**
  - Any unknown path
  - `GET /data/:id` where `id` doesn’t exist
- **500 Internal Server Error**
  - Unexpected runtime errors while parsing or routing

Each sends a proper HTTP status line and a simple explanatory body.

---

## 🧱 Design & Architecture

### 🗂 In-Memory Store

- Uses `Map<number, object>` to hold JSON objects.
- `nextId` auto-increments for each new POST.
- Data lives only while the server runs (no database on purpose).

### ⚙️ Concurrency Model

- Node.js event loop + non-blocking I/O.
- Each connection is a socket handled via callbacks.
- No threads to manage manually; Node can handle many concurrent requests naturally. [web:40]

---

## 🧪 Quick Testing Cheat Sheet

With the server running on port 8080:

```
# 1. Basic welcome
curl http://localhost:8080/

# 2. Echo
curl "http://localhost:8080/echo?message=hello"

# 3. (Linux/Mac) POST JSON
curl -X POST http://localhost:8080/data \
  -H "Content-Type: application/json" \
  -d '{"name":"test","value":123}'
```

**Windows PowerShell equivalents:**

```
# POST /data
$body = @{name="test"; value=123} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/data" -Method POST -Body $body -ContentType "application/json"

# GET /data
Invoke-WebRequest -Uri "http://localhost:8080/data" | Select-Object -ExpandProperty Content

# GET /data/1
Invoke-WebRequest -Uri "http://localhost:8080/data/1" | Select-Object -ExpandProperty Content
```

---

## ⚠️ Limitations & Future Improvements

Current limitations:

- No persistent storage (all in-memory).
- No HTTPS (plain HTTP over TCP).
- No chunked transfer encoding.
- No keep-alive connections (each request closes the socket).
- Limited handling for very malformed HTTP messages.

Possible next steps:

- Implement HTTP keep-alive.
- Add static file serving (e.g., `GET /index.html`).
- Add basic authentication and CORS headers.
- Add body size limits and timeouts for robustness under heavy load.

---

> **Goal of this project:** not to be a production server, but to truly **understand HTTP/1.1 over TCP by building it yourself**, line by line.
```

