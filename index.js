import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";

dotenv.config();
const app = express();
app.use(cors());
app.use(json());

const mongoClient = new MongoClient(process.env.URL_MONGO);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("bate-papo-uol");
});

const participantSchema = joi.object({
  name: joi.string().required(),
});

const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().valid("message", "private_message").required(),
});

app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const validation = participantSchema.validate({ name }, { abortEarly: true });

  if (validation.error) {
    console.log(validation.error.details);
    return res.sendStatus(422);
  }

  try {
    const participantExist = await db
      .collection("users")
      .findOne({ name: name });

    if (participantExist) {
      return res.sendStatus(409);
    }

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
  const from = req.header("user");

  const validation = messageSchema.validate(req.body, {
    abortEarly: false,
  });

  if (validation.error) {
    console.log(validation.error.details);
    return res.sendStatus(422);
  }

  try {
    const participantExist = await db
      .collection("users")
      .findOne({ name: from });

    if (!participantExist) {
      return res.sendStatus(422);
    }

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
      return res.send(messagesLimit);
    }

    res.send(filteredMessages);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post("/status", async (req, res) => {
  const name = req.header("user");

  try {
    const isParticipant = await db.collection("users").findOne({ name: name });

    if (!isParticipant) {
      res.sendStatus(404);
    }

    await db
      .collection("users")
      .updateOne({ name: name }, { $set: { lastStatus: Date.now() } });
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
});

setInterval(async () => {
  try {
    const users = await db.collection("users").find({}).toArray();
    const timeNow = Date.now();

    users.map(async (user) => {
      const { lastStatus, name } = user;
      if (timeNow - lastStatus > 10000) {
        await db.collection("users").deleteOne({ name });
        await db.collection("messages").insertOne({
          from: name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: dayjs().format("HH:mm:ss"),
        });
        return console.log(`${name} não está mais ativo`);
      }
    });
  } catch (error) {
    console.log("Erro ao excluir usuário inativo");
  }
}, 15000);

app.listen(5000, () => console.log("Server On!"));
