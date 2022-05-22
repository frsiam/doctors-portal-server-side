const { MongoClient, ServerApiVersion, MongoDBNamespace } = require('mongodb');
const express = require('express')
const app = express()
const cors = require('cors');
const { query } = require('express');
require('dotenv').config();
const port = process.env.PORT || 4000;

//middle tier
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hae28.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const servicesCollection = client.db("doctors-portal").collection("services");
        const bookingCollection = client.db("doctors-portal").collection("booking");

        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = servicesCollection.find(query);
            const services = await cursor.toArray();
            res.send(services)
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

        app.get('/booking', async (req, res) => {
            const patient = req.query.patient;
            const query = { patient: patient };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings)
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