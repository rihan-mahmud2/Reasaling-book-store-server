const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();

app.use(cors());
app.use(express.json());
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vjq6aig.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const categroyCollection = client
      .db("Bookshop")
      .collection("bookCategories");
    const userCollection = client.db("Bookshop").collection("users");

    app.put("/jwt", async (req, res) => {
      const email = req.body;
      console.log(email);
      const token = jwt.sign(email, process.env.SECRET_API_KEY, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      console.log(email);
      const user = await userCollection.findOne(query);

      res.send({ role: user?.role });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await categroyCollection.insertOne(product);

      res.send(result);
    });

    app.get("/category/:name", async (req, res) => {
      const name = req.params.name;
      const query = {
        category: name,
      };
      const categories = await categroyCollection.find(query).toArray();
      res.send(categories);
    });
    app.get("/category", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = {
        email: email,
      };
      const categories = await categroyCollection.find(query).toArray();
      res.send(categories);
    });
  } catch {}
}

run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("The server is running");
});

app.listen(port, () => {
  console.log(`The server is listening on ${port}`);
});
