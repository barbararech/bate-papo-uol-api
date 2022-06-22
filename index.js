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

  res.sendStatus(201);
});

app.get("/messages", (req, res) => {});

app.post("/status", (req, res) => {});

app.listen(5000, () => console.log("Server On!"));
