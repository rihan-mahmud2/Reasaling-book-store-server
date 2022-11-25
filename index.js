const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();

app.use(cors());
app.use(express.json());
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vjq6aig.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const veryfyJwt = async (req, res, next) => {
  const authorization = req.headers?.authorization;

  if (!authorization) {
    res.status(403).send({ message: "Forbidden" });
  }

  jwt.verify(authorization, process.env.SECRET_API_KEY, (err, decoded) => {
    if (err) {
      res.status(401).send({ message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    const categroyCollection = client
      .db("Bookshop")
      .collection("bookCategories");
    const userCollection = client.db("Bookshop").collection("users");
    const bookingCollection = client.db("Bookshop").collection("bookings");
    app.put("/jwt", async (req, res) => {
      const email = req.body;
      console.log(email);
      const token = jwt.sign(email, process.env.SECRET_API_KEY, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    //verify adming route

    const verifyAdmin = async (req, res, next) => {
      const doecodedEmail = req.decoded.email;
      const query = {
        email: doecodedEmail,
      };

      const user = await userCollection.findOne(query);
      if (user.roel !== "admin") {
        res.status(403).send({ message: "forbidden access" });
      }

      next();
    };

    //saving the booking to mongodb
    app.post("/bookings", async (req, res) => {
      const userBooking = req.body;
      const booking = await bookingCollection.insertOne(userBooking);
      res.send(booking);
    });

    //get my orders from booking collection
    app.get("/bookings/:email", async (req, res) => {
      const email = req.params.email;
      const filter = {
        email: email,
      };
      const bookings = await bookingCollection.find(filter).toArray();
      res.send(bookings);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      console.log(email);
      const user = await userCollection.findOne(query);

      res.send({ role: user?.role });
    });

    //GET ALL USERS
    app.get("/users", async (req, res) => {
      const role = req.query.role;
      console.log(role);
      const query = {
        role: role,
      };
      const users = await userCollection.find(query).toArray();
      res.send(users);
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

    //getting the my products with email query
    app.get("/category", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = {
        email: email,
      };
      const categories = await categroyCollection.find(query).toArray();
      res.send(categories);
    });

    //changing the status of the product sold or advertised
    app.put("/category/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: ObjectId(id),
      };
      const updatedDoc = {
        $set: {
          status: "sold",
        },
      };
      const options = {
        upsert: true,
      };

      const result = await categroyCollection.updateOne(
        filter,
        updatedDoc,
        options
      );

      res.send(result);
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
