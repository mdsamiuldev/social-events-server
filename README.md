# Kindred — Social Development Events Server API

Backend RESTful API service built with Express.js and MongoDB to power the community-driven event management platform.

## 🌐 Live API & Links
- **Client Live Site:** [https://ais-dev-pdwioijd5pyoafqyc62r2m-371423969760.asia-northeast1.run.app](https://ais-dev-pdwioijd5pyoafqyc62r2m-371423969760.asia-northeast1.run.app)
- **Shared App URL:** [https://ais-pre-pdwioijd5pyoafqyc62r2m-371423969760.asia-northeast1.run.app](https://ais-pre-pdwioijd5pyoafqyc62r2m-371423969760.asia-northeast1.run.app)

---

## ⚡ API Endpoints

- `GET /` - Root health check
- `GET /events` - Get events (supports `?limit=6`, `?upcomingOnly=true`, `?category=...`, `?search=...`, `?creatorEmail=...`)
- `GET /events/:id` - Get specific event details
- `POST /events` - Create new event (enforces future-only date constraint)
- `PUT /events/:id` - Update existing event (authorized for creator only)
- `DELETE /events/:id` - Delete event and associated attendee records (creator only)
- `GET /events/:id/join` - Check whether user has joined
- `POST /events/:id/join` - Join an event and increment attendee count
- `DELETE /events/:id/join` - Leave event and decrement attendee count
- `GET /joined-events?email=...` - List all events joined by user sorted by date

---

## 🛠️ Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Native Driver
- **Utilities:** CORS, dotenv
