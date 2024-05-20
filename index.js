const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();
const port = process.env.PORT || 6001;

const app = express();
const corsOption = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
],
  credentials: true,
  optionSuccessStatus: 200,
}

app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser())

//verify jwt middleware

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if(!token) {
    return res.status(401).send({ message: 'unauthoeized access' })
  }
  if(token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if(err) {
        console.log(err);
        return res.status(401).send( { message: 'unathorized access'})
      }
      console.log(decoded);
      req.user = decoded
      next()
    })
  }
}


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
    const reviewsCollection = client.db('splendico').collection('reviews');

    //jwt generate
    app.post('/jwt', async (req,res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1d'
      })
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
      .send({ success: true})
    })

    //clear token on logout

    app.get('/logout', (req,res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 0,
      })
      .send({ success: true})
    })

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

    //get 6 available suite category room

    app.get('/suite', async(req, res) => {
      try {
        const query = {category: 'SUITE', available: 'Available'};
        const result = await roomsCollection.find(query).limit(6).toArray()
        res.send(result);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    })

    //booking db

    app.post('/booking', async(req, res) => {
      const bookingData = req.body;
      console.log(bookingData);
      const result = await bookingsCollection.insertOne(bookingData);
      res.send(result);
    })

    //get all bookings by email

    app.get('/bookings/:email',verifyToken, async(req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;
      
      if(tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access'})
      }
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

    //post review post

    app.post('/review', async(req, res) => {
      const reviewData = req.body;
      console.log(reviewData);
      const result = await reviewsCollection.insertOne(reviewData);
      res.send(result);
    })

    //get review for specific room

    app.get('/reviews/:roomId', async(req, res) => {
      const roomId = req.params.roomId;
      const query = { roomId : roomId}
      const result = await reviewsCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/reviews', async(req, res) => {
      const result = await reviewsCollection.find().limit(6).sort({date: -1 }).toArray();
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
