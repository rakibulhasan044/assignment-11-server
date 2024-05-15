const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 6001;

const app = express()

app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.erh7g8c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    // Send a ping to confirm a successful connection

    const roomsCollection = client.db('splendico').collection('rooms');

    app.get('/rooms', async(req, res) => {
        const result = await roomsCollection.find().toArray();
        res.send(result);
    })

    app.get('/rooms/:category', async(req, res) => {
        const category = req.params.category;
        const query = { category : category};
        const result = await roomsCollection.find(query).toArray();
        res.send(result);
    })
    

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) =>{
    res.send('Slendico hotel server running')
})

app.listen(port, () => {
    console.log(`Slendico hotel server running on port: ${port}`);
})