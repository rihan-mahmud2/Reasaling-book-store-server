const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const stripe = require("stripe")(process.env.REACT_STRIPE_KEY);

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

const calculateOrderAmount = (items) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return 100 * items;
};

app.post("/create-payment-intent", async (req, res) => {
  const items = req.body;

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(items.productPrice),
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
  });

  console.log(paymentIntent.client_secret);

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

const veryfyJwt = (req, res, next) => {
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
    const whishListCollection = client.db("Bookshop").collection("whishlist");
    const paymentsCollection = client.db("Bookshop").collection("payments");
    const categoriesCollection = client.db("Bookshop").collection("categories");
    const reportsCollection = client.db("Bookshop").collection("reports");
    app.put("/jwt", async (req, res) => {
      const email = req.body;
      console.log(email);
      const token = jwt.sign(email, process.env.SECRET_API_KEY, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    //posting reports data
    app.post("/reports", async (req, res) => {
      const reportInfo = req.body;
      const result = await reportsCollection.insertOne(reportInfo);
      res.send(result);
    });

    //getting reported data
    app.get("/reports", async (req, res) => {
      const query = {};
      const result = await reportsCollection.find(query).toArray();
      res.send(result);
    });
    //get category data

    app.get("/categoires", async (req, res) => {
      const query = {};
      const categories = await categoriesCollection.find(query).toArray();
      res.send(categories);
    });

    //verify adming route

    const verifyAdmin = async (req, res, next) => {
      const doecodedEmail = req.decoded.email;
      console.log(doecodedEmail);
      const query = {
        email: doecodedEmail,
      };

      const user = await userCollection.findOne(query);
      if (user.role !== "admin") {
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

    app.get("/bookings/:email", veryfyJwt, async (req, res) => {
      const email = req.params.email;
      const filter = {
        email: email,
      };
      const bookings = await bookingCollection.find(filter).toArray();
      res.send(bookings);
    });

    app.get("/payment/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: ObjectId(id) };
      const booking = await bookingCollection.findOne(query);
      res.send(booking);
    });

    //saving teh payment info to database
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const category_id = payment.category_id;
      const filterCategory = { _id: ObjectId(category_id) };
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
        },
      };
      const categoryBooking = await categroyCollection.updateOne(
        filterCategory,
        updatedDoc
      );
      const paidBooking = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // get advertised items
    app.get("/advertised", veryfyJwt, async (req, res) => {
      const filter = {
        advertised: "yes",
      };
      const advertisedItems = await categroyCollection.find(filter).toArray();
      res.send(advertisedItems);
    });

    // get all whislist item

    app.get("/whishlist/:email", veryfyJwt, async (req, res) => {
      const email = req.params.email;
      const filter = {
        userEmail: email,
      };

      const whishlistItems = await whishListCollection.find(filter).toArray();
      res.send(whishlistItems);
    });

    //post whish list items

    app.post("/whishlist", async (req, res) => {
      const item = req.body;
      const result = await whishListCollection.insertOne(item);
      res.send(result);
    });

    //get my orders from booking collection

    app.get("/users/:email", veryfyJwt, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);

      res.send({ role: user?.role });
    });

    //deleting seller
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: ObjectId(id),
      };

      const result = await userCollection.deleteOne(filter);

      res.send(result);
    });

    // deleting frome whishListCollection
    app.delete("/whsihlist/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: ObjectId(id),
      };

      const result = await whishListCollection.deleteOne(filter);

      res.send(result);
    });

    // verifyUser status

    app.put("/verifyUser/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: ObjectId(id),
      };
      const updatedDoc = {
        $set: {
          verified: "yes",
        },
      };
      const options = {
        upsert: true,
      };

      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );

      res.send(result);
    });

    //GET ALL USERS
    app.get("/users", veryfyJwt, async (req, res) => {
      const role = req.query.role;

      const query = {
        role: role,
      };
      const users = await userCollection.find(query).toArray();
      res.send(users);
    });

    app.get("/user/:role", async (req, res) => {
      const role = req.params.role;
      const filter = {
        role: role,
      };
      const users = await userCollection.find(filter).toArray();
      res.send(users);
    });

    app.post("/users", veryfyJwt, async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await categroyCollection.insertOne(product);

      res.send(result);
    });

    app.get("/category/:name", veryfyJwt, async (req, res) => {
      const name = req.params.name;
      const query = {
        category: name,
      };
      const categories = await categroyCollection.find(query).toArray();
      res.send(categories);
    });

    // get seller status

    app.get("/verifiedStatus/:email", veryfyJwt, async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
      };

      const user = await userCollection.findOne(query);
      res.send(user);
    });

    //getting the my products with email query
    app.get("/category", async (req, res) => {
      const email = req.query.email;

      const query = {
        email: email,
      };
      const categories = await categroyCollection.find(query).toArray();
      res.send(categories);
    });

    //changing the status of the product sold or advertised
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: ObjectId(id),
      };
      const updatedDoc = {
        $set: {
          advertised: "yes",
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
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = {
        _id: ObjectId(id),
      };

      const result = await categroyCollection.deleteOne(filter);

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
