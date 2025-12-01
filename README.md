```
### HTTP/1.1 Server from Scratch (Node.js + TCP Sockets)

## Overview

This project is a **basic HTTP/1.1 server built completely from scratch** using **Node.js** and the **`net` (TCP) module**.  
No high-level HTTP frameworks (`http.createServer`, Express, etc.) or routing/HTTP parsing libraries are used.  
All HTTP request parsing and response formatting is implemented manually over raw TCP sockets. [web:38][web:41]

The goal is to deeply understand:

- How HTTP sits on top of TCP  
- What an HTTP message actually looks like (request line, headers, body)  
- How methods like `GET` and `POST` are distinguished in the raw text  
- How `Content-Length`, `Host`, and other headers are used

---

## Setup and Running

### Prerequisites

- Node.js installed (`node -v` to confirm) [web:46]
- Git (optional, for version control)

### Clone and Install

```
# Clone your repo (example)
git clone <your-repo-url>
cd HTTP-TASK   # or your folder name
```

There are no external dependencies, so no `npm install` is required.

### Run the Server

```
# Default port 8080
node server.js

# Or custom port
node server.js 3000
```

You should see:

```
Raw HTTP/1.1 Server listening on port 8080
Test with: curl http://localhost:8080/
```

---

## Supported Endpoints

All endpoints speak plain HTTP/1.1 over TCP.

### 1. `GET /` – Welcome

- **Description**: Returns a simple welcome message.
- **Response**: `200 OK`, `text/plain`

Example:

```
curl http://localhost:8080/
```

---

### 2. `GET /echo?message=...` – Echo Message

- **Description**: Reads the `message` query parameter and returns it as the body.
- **Response**: `200 OK`, `text/plain`

Example:

```
curl "http://localhost:8080/echo?message=hello"
# → hello
```

---

### 3. `POST /data` – Store JSON in Memory

- **Description**: Accepts a JSON body, stores it in memory with an auto-incremented `id`, and returns the assigned `id`.
- **Required Header**: `Content-Type: application/json`
- **Response**: `200 OK`, `application/json`, body like:

```
{"success": true, "id": 1}
```

#### PowerShell example

```
$body = @{name="test"; value=123} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8080/data" -Method POST -Body $body -ContentType "application/json"
```

#### curl.exe example (Windows)

```
curl.exe -X POST http://localhost:8080/data -H "Content-Type: application/json" -d "{\"name\":\"test\",\"value\":123}"
```

---

### 4. `GET /data` – Get All Stored Data

- **Description**: Returns all previously stored JSON objects as an array.
- **Response**: `200 OK`, `application/json`, e.g.:

```
[
  {"id":1,"name":"test","value":123},
  {"id":2,"name":"another","value":456}
]
```

Example:

```
curl http://localhost:8080/data
```

---

### 5. `GET /data/:id` – Get Single Item by ID

- **Description**: Returns a single stored object by its numeric `id`.
- **Response (found)**: `200 OK`, JSON object:

```
{"id":1,"name":"test","value":123}
```

- **Response (not found)**: `404 Not Found`, plain text.

Examples:

```
# After posting something (id = 1)
curl http://localhost:8080/data/1

# Non-existent id
curl http://localhost:8080/data/999
```

---

## HTTP and Protocol Details

### Manual Request Parsing

The server reads raw bytes from the TCP socket and:

1. Finds the **request line**:  
   `METHOD PATH HTTP/1.1` (e.g., `GET /data HTTP/1.1`). [web:38]
2. Splits and stores **headers** (`Key: Value`) into a map (lowercased keys).
3. Detects the end of headers using `\r\n\r\n` (CRLF CRLF).
4. Reads the **body** according to `Content-Length` (for POST). [web:36]

This means the server understands:

- How a request is classified as `GET` vs `POST` (= first word of request line)
- How large the body is (via `Content-Length`)
- How query parameters look (`/echo?message=hello`)

### Manual Response Formatting

Responses are constructed as raw strings:

- **Status line**: `HTTP/1.1 200 OK\r\n`
- **Headers**:
  - `Date`
  - `Server`
  - `Connection`
  - `Content-Type`
  - `Content-Length`
- **Blank line**: `\r\n`
- **Body**: plain text or JSON string

Example response:

```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 27
Date: Mon, 01 Dec 2025 18:00:00 GMT
Connection: close

{"success":true,"id":1}
```

---

## Error Handling

The server handles several common error cases:

- **400 Bad Request**
  - Invalid JSON in `POST /data`
  - Wrong or missing `Content-Type` for JSON

- **404 Not Found**
  - Any path not matching the defined routes
  - `GET /data/:id` when `id` does not exist

- **500 Internal Server Error**
  - Uncaught runtime errors while routing or parsing

Each error sends the appropriate HTTP status line and a simple message in the body.

---

## Design Decisions and Architecture

### In-Memory Data Store

- Implemented with a simple `Map<number, object>`:
  - `nextId` counter auto-increments
  - Data is not persisted; it lives only while the server is running
- This keeps focus on HTTP, not databases.

### Concurrency Model

- Node.js uses an **event-driven, non-blocking** I/O model.
- Each new connection (socket) is handled via callbacks on the event loop.
- This naturally supports many concurrent clients without manual thread management. [web:40]

---

## Testing Cheat Sheet

With server running on port 8080:

```
# 1. GET /
curl http://localhost:8080/

# 2. GET /echo
curl "http://localhost:8080/echo?message=hello"

# 3. POST /data (Linux/Mac style)
curl -X POST http://localhost:8080/data \
  -H "Content-Type: application/json" \
  -d '{"name":"test","value":123}'
```

**Windows PowerShell alternatives:**

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

## Limitations and Possible Improvements

- No persistent storage (everything is in memory).
- No HTTPS (HTTP only, on top of TCP).
- No chunked transfer encoding support.
- No keep-alive connections (each request closes the connection).
- Limited validation of malformed HTTP requests.

Future improvements could include:

- Keep-alive and connection reuse.
- Static file serving.
- Basic authentication and CORS headers.
- Body size limits and timeouts for robustness under heavy load.
```


