

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
