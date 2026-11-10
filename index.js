/* eslint-disable */
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/social_events";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect to MongoDB
    // await client.connect();
    const db = client.db("social_events");
    const eventsCollection = db.collection("events");
    const attendeesCollection = db.collection("attendees");

    console.log("Connected to MongoDB successfully!");

    // 1. Root Route
    app.get("/", (req, res) => {
      res.send({ message: "Social Development Events API Server Running" });
    });

    // 2. Get Events (Supports limit, upcomingOnly, category, search, creatorEmail)
    app.get("/events", async (req, res) => {
      try {
        const { limit, upcomingOnly, category, search, creatorEmail } = req.query;
        const query = {};

        if (creatorEmail) {
          query.creatorEmail = creatorEmail;
        }

        if (upcomingOnly === "true") {
          query.date = { $gte: new Date().toISOString() };
        }

        if (category && category !== "All") {
          query.$or = [{ eventType: category }, { category: category }];
        }

        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
          ];
        }

        let cursor = eventsCollection.find(query).sort({ date: 1 });

        if (limit) {
          cursor = cursor.limit(parseInt(limit));
        }

        const events = await cursor.toArray();
        res.send(events);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).send({ error: "Failed to fetch events" });
      }
    });

    // 3. Get Single Event Details
    app.get("/events/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
        const event = await eventsCollection.findOne(query);

        if (!event) {
          return res.status(404).send({ error: "Event not found" });
        }
        res.send(event);
      } catch (error) {
        console.error("Error fetching event:", error);
        res.status(500).send({ error: "Failed to fetch event" });
      }
    });

    // 4. Create New Event (Future date validation)
    app.post("/events", async (req, res) => {
      try {
        const { title, description, eventType, category, thumbnail, location, date, creatorEmail, creatorName } = req.body;

        if (!title || !description || !location || !date || !creatorEmail) {
          return res.status(400).send({ error: "All required fields must be provided." });
        }

        // Validate future date
        const targetTime = new Date(date).getTime();
        if (isNaN(targetTime) || targetTime <= Date.now()) {
          return res.status(400).send({ error: "Event date must be in the future. Past dates cannot be added." });
        }

        const newEvent = {
          title,
          description,
          eventType: eventType || category || "Community Service",
          category: category || eventType || "Community Service",
          thumbnail: thumbnail || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
          location,
          date,
          creatorEmail,
          creatorName: creatorName || creatorEmail.split("@")[0],
          attendees: 0,
          createdAt: new Date().toISOString(),
        };

        const result = await eventsCollection.insertOne(newEvent);
        res.status(201).send({ ...newEvent, _id: result.insertedId });
      } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).send({ error: "Failed to create event" });
      }
    });

    // 5. Update Event (Creator Only)
    app.put("/events/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { title, description, eventType, thumbnail, location, date, userEmail } = req.body;

        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
        const existing = await eventsCollection.findOne(query);

        if (!existing) {
          return res.status(404).send({ error: "Event not found" });
        }

        if (existing.creatorEmail !== userEmail) {
          return res.status(403).send({ error: "You are not authorized to update this event." });
        }

        // Validate future date
        const targetTime = new Date(date).getTime();
        if (isNaN(targetTime) || targetTime <= Date.now()) {
          return res.status(400).send({ error: "Event date must be in the future." });
        }

        const updatedDoc = {
          $set: {
            title,
            description,
            eventType: eventType || existing.eventType,
            thumbnail: thumbnail || existing.thumbnail,
            location,
            date,
            updatedAt: new Date().toISOString(),
          },
        };

        await eventsCollection.updateOne(query, updatedDoc);
        res.send({ message: "Event updated successfully", eventId: id });
      } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).send({ error: "Failed to update event" });
      }
    });

    // 6. Delete Event (Creator Only)
    app.delete("/events/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { userEmail } = req.query;

        const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
        const existing = await eventsCollection.findOne(query);

        if (!existing) {
          return res.status(404).send({ error: "Event not found" });
        }

        if (existing.creatorEmail !== userEmail) {
          return res.status(403).send({ error: "You are not authorized to delete this event." });
        }

        await eventsCollection.deleteOne(query);
        await attendeesCollection.deleteMany({ eventId: id });

        res.send({ message: "Event deleted successfully", deletedId: id });
      } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).send({ error: "Failed to delete event" });
      }
    });

    // 7. Check Join Status
    app.get("/events/:id/join", async (req, res) => {
      try {
        const { id } = req.params;
        const { email } = req.query;

        if (!email) {
          return res.send({ hasJoined: false });
        }

        const record = await attendeesCollection.findOne({ eventId: id, userEmail: email });
        res.send({ hasJoined: !!record });
      } catch (error) {
        res.status(500).send({ error: "Failed to check join status" });
      }
    });

    // 8. Join Event
    app.post("/events/:id/join", async (req, res) => {
      try {
        const { id } = req.params;
        const { userEmail, userName } = req.body;

        if (!userEmail) {
          return res.status(400).send({ error: "User email is required to join." });
        }

        const existing = await attendeesCollection.findOne({ eventId: id, userEmail });
        if (existing) {
          return res.status(400).send({ error: "You have already joined this event." });
        }

        const eventQuery = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
        const event = await eventsCollection.findOne(eventQuery);

        if (!event) {
          return res.status(404).send({ error: "Event not found" });
        }

        await attendeesCollection.insertOne({
          eventId: id,
          userEmail,
          userName: userName || userEmail.split("@")[0],
          joinedAt: new Date().toISOString(),
          eventDetails: {
            title: event.title,
            date: event.date,
            location: event.location,
            thumbnail: event.thumbnail,
            eventType: event.eventType || event.category,
          },
        });

        await eventsCollection.updateOne(eventQuery, { $inc: { attendees: 1 } });

        res.status(201).send({ message: "Successfully joined event!", eventId: id });
      } catch (error) {
        console.error("Error joining event:", error);
        res.status(500).send({ error: "Failed to join event" });
      }
    });

    // 9. Leave Event
    app.delete("/events/:id/join", async (req, res) => {
      try {
        const { id } = req.params;
        const { userEmail } = req.query;

        if (!userEmail) {
          return res.status(400).send({ error: "User email required" });
        }

        await attendeesCollection.deleteOne({ eventId: id, userEmail });

        const eventQuery = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
        await eventsCollection.updateOne(eventQuery, { $inc: { attendees: -1 } });

        res.send({ message: "Successfully cancelled participation" });
      } catch (error) {
        res.status(500).send({ error: "Failed to leave event" });
      }
    });

    // 10. Get Joined Events for a User
    app.get("/joined-events", async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) {
          return res.status(400).send({ error: "Email query param required" });
        }

        const records = await attendeesCollection.find({ userEmail: email }).toArray();
        const joinedEvents = records
          .map((r) => ({
            _id: r.eventId,
            title: r.eventDetails?.title || "Community Event",
            date: r.eventDetails?.date || "",
            location: r.eventDetails?.location || "",
            thumbnail: r.eventDetails?.thumbnail || "",
            eventType: r.eventDetails?.eventType || "Community Service",
            joinedAt: r.joinedAt,
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        res.send(joinedEvents);
      } catch (error) {
        console.error("Error fetching joined events:", error);
        res.status(500).send({ error: "Failed to fetch joined events" });
      }
    });

  } finally {
    // Keep connection alive
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
