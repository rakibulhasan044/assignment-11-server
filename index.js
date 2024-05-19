const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 6001;

const app = express();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.erh7g8c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    // Send a ping to confirm a successful connection

    const roomsCollection = client.db("splendico").collection("rooms");
    const bookingsCollection = client.db("splendico").collection("bookings");

    app.get("/rooms", async (req, res) => {
      try {
        console.log(req.query);
        const page = parseInt(req.query.page) -1;
        const size = parseInt(req.query.size);
        const filter = req.query.filter;
        const priceRange = req.query.priceRange;
        let query = {}
        if(filter) query = { category: filter}
        if(priceRange) {
          const [min, max] = priceRange.split('-').map(Number);
          query.price = { $gte: min, $lte:max };
        }

        const result = await roomsCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/roomsCount", async (req, res) => {
      const filter = req.query.filter;
      const priceRange = req.query.priceRange;
      let query = {};
      if(filter) query ={ category: filter }
      if (priceRange) {
        const [min, max] = priceRange.split('-').map(Number);
        query.price = { $gte: min, $lte: max };
      }
      const count = await roomsCollection.countDocuments(query);
      res.send({ count });
    });

    app.get("/rooms/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)};
      const result = await roomsCollection.findOne(query);
      res.send(result);
    })

    //room status update

    app.patch('/room/:id', async(req, res) => {
      const id = req.params.id;
      const available = req.body;
      const query = { _id: new ObjectId(id)};
      const updateDoc = {
        $set: available
      }
      const result = await roomsCollection.updateOne(query, updateDoc);
      res.send(result);

    })

    //booking db

    app.post('/booking', async(req, res) => {
      const bookingData = req.body;
      console.log(bookingData);
      const result = await bookingsCollection.insertOne(bookingData);
      res.send(result);
    })

    //get all bookings by email

    app.get('/bookings/:email', async(req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    })

    //delete booking

    app.delete('/booking/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id)};
      const result = await bookingsCollection.deleteOne(query);
      res.send(result)
    })
    

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Slendico hotel server running");
});

app.listen(port, () => {
  console.log(`Slendico hotel server running on port: ${port}`);
});
