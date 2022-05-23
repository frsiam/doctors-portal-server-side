const { MongoClient, ServerApiVersion, MongoDBNamespace } = require('mongodb');
const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 4000;

//middle tier
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hae28.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorize access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access from verify function' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const servicesCollection = client.db("doctors-portal").collection("services");
        const bookingCollection = client.db("doctors-portal").collection("booking");
        const userCollection = client.db("doctors-portal").collection("users");

        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)
        })

        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        app.put('/user/:email', async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = { $set: user };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        // This is not the proper way to query.
        // After learning more about MongoDBNamespace. use aggregate lookup, pipeline, match, group 
        app.get('/available', async (req, res) => {
            const date = req.query.date;
            // step-1: get all services from serviceCollection
            const services = await servicesCollection.find().toArray();

            //step 2: get the booked services from bookingCollection of that date
            const query = { date: date };
            const bookedServices = await bookingCollection.find(query).toArray();
            // for each service 
            services.forEach(service => {
                // step 4: for each service, find booking slot for that service
                // slot paoyar jonno amra service er sathe name ta match kore shei service er slot gulu ber korbo tai 
                const serviceBookings = bookedServices.filter(booking => booking.treatmentName === service.name);
                // every single service er je slot gulu booked ase oigulu bookedSlot er maje paoya jabe 
                const bookedSlots = serviceBookings.map(s => s.slot);
                // tarpor every service er je slot gulu bookedSlot er maje nai oigulu to muloto available hobe arekjon patient er jonno tai sheigulu avaiable er maje rakha ase 
                const available = service.slots.filter(s => !bookedSlots.includes(s));
                // tarpor service jehetu ekta object tai tar ekta key 'availabe' er maje shei available slot gulu rakha hoise akhane 
                service.slots = available;
            })
            res.send(services);
        })

        app.get('/booking', verifyJWT, async (req, res) => {
            const patient = req.query.patient;
            const decodedEmail = req.decoded.email;
            if (patient === decodedEmail) {
                const query = { patient: patient };
                const bookings = await bookingCollection.find(query).toArray();
                return res.send(bookings);
            }
            else {
                return res.status(403).send({ message: 'Forbidden access from get method of back end' })
            }
        })

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const query = { treatmentName: booking.treatmentName, date: booking.date, patient: booking.patient }
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await bookingCollection.insertOne(booking);
            res.send({ success: true, result });
        })
    }
    finally {
        // client.close();
    }
}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Doctors app listening on port ${port}`)
})