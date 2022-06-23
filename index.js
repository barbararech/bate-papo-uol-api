import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();
const app = express();
app.use(cors());
app.use(json());

const mongoClient = new MongoClient(process.env.URL_MONGO);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("bate-papo-uol");
});

app.post("/participants", async (req, res) => {
  const { name } = req.body;

  try {
    await db.collection("users").insertOne({
      name: name,
      lastStatus: Date.now(),
    });
    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const users = await db.collection("users").find({}).toArray();
    res.send(users);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  console.log(req.body);

  const from = req.header("user");

  try {
    await db.collection("messages").insertOne({
      from,
      to,
      text,
      type,
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);
  const user = req.header("user");

  try {
    const messages = await db.collection("messages").find({}).toArray();

    const filteredMessages = messages.filter((message) => {
      const { from, to, type } = message;
      if (type === "message" || type === "status") {
        return true;
      } else if (to === "Todos" || to === user || from === user) {
        return true;
      }
    });

    if (limit) {
      const messagesLimit = filteredMessages.slice(-limit);
      res.send(messagesLimit);
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post("/status", async (req, res) => {
  const name = req.header("user");

  try {
    const isParticipant = await db.collection("users").findOne({ name: name });

    if (!isParticipant) {
      res.sendStatus(400);
    }

    await db
      .collection("users")
      .updateOne({ name: name }, { $set: { lastStatus: Date.now() } }); 
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.listen(5000, () => console.log("Server On!"));
