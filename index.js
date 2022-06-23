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

app.post("/participants", (req, res) => {
  const { name } = req.body;

  db.collection("users")
    .insertOne({
      name: name,
      lastStatus: Date.now(),
    })
    .catch(() => res.sendStatus(500));

  db.collection("messages")
    .insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    })
    .catch(() => res.sendStatus(500));

  res.sendStatus(201);
});

app.get("/participants", (req, res) => {
  db.collection("users")
    .find({})
    .toArray()
    .then((users) => res.send(users))
    .catch((e) => res.sendStatus(500));
});

app.post("/messages", (req, res) => {
  const { to, text, type } = req.body;
  console.log(req.body);

  const from = req.header("user");

  db.collection("messages")
    .insertOne({
      from,
      to,
      text,
      type,
      time: dayjs().format("HH:mm:ss"),
    })
    .catch(() => res.sendStatus(500));
  console.log(type);
  res.sendStatus(201);
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

    // console.log(filteredMessages);
    if (limit) {
      const messagesLimit = filteredMessages.slice(-limit);
      res.send(messagesLimit);
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post("/status", (req, res) => {
  const name = req.header("user");
  const isParticipant = db.collection("users").findOne({ name: name });

  if (!isParticipant) {
    res.sendStatus(400);
  }

  db.collection("users").updateOne(
    { name: name },
    { $set: { lastStatus: Date.now() } }
  );

  res.sendStatus(200);
});

app.listen(5000, () => console.log("Server On!"));
