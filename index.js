const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
require('dotenv').config();
app.use(cors());
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.MONGODB_URI;

app.get('/', (req, res) => {
    res.send('Hello World!');
});
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        const connection = await client.connect();
        const db = connection.db("Freelance-Microtask-Platform");
        const TasksCollection = db.collection("Tasks");
        const proposalCollection = db.collection("proposals");
        const FreelancersCollection = db.collection("Freelancers");
        const ClientsCollection = db.collection("Clients");
        const ReviewsCollection = db.collection("Reviews");






        // task related funtion
        app.post('/tasks', async (req, res) => {
            const task = req.body;
            const result = await TasksCollection.insertOne(task);
            res.send(result);
        });
        app.get('/tasks', async (req, res) => {
            const limit = parseInt(req.query.limit) || 0; // Get the limit from query parameters, default to 0 (no limit)
            const result = await TasksCollection.find().limit(limit).toArray();
            res.send(result);
        });
        app.get('/tasksid/:id', async (req, res) => {
            const id = req.params.id;
            const result = await TasksCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });
        app.get("/my-tasks/:clientId", async (req, res) => {
            const clientId = req.params.clientId;
            const result = await TasksCollection.find({
                ClientId: clientId,
            }).toArray();
            res.send(result);
        });

        app.patch("/updatetaskstatus/:taskId", async (req, res) => {
            const { taskId } = req.params;
            console.log("task id", taskId)
            const { status } = req.body;

            const allowedStatuses = ["booked", "complite"];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ message: "Invalid status value" });
            }

            try {
                // const objectId = await new ObjectId(id);

                const task = await TasksCollection.findOne({ _id: new ObjectId(taskId) });
                console.log(task)

                if (!task) {
                    return res.status(404).json({
                        message: "Proposal not found",
                        id,
                    });
                }

                const result = await TasksCollection.updateOne(
                    { _id: new ObjectId(taskId) },
                    { $set: { status } }
                );

                res.json({
                    message: "Updated successfully",
                    modifiedCount: result.modifiedCount,
                });

            } catch (error) {
                console.log(error);
                res.status(500).json({ message: "Server error janina" });
            }
        });

        app.delete("/deleteclinttask/:id", async (req, res) => {
            const id = req.params.id
            console.log("clint task delete", id)
            const result = await TasksCollection.deleteOne({ _id: new ObjectId(id) })
            res.send(result)
        })


        //proposal related funtion

        app.post('/proposals', async (req, res) => {
            const proposal = req.body;
            const result = await proposalCollection.insertOne(proposal);
            res.send(result);
        });


        app.patch("/task/proposals/:id", async (req, res) => {
            const { id } = req.params;
            console.log(id)
            const { status } = req.body;

            const allowedStatuses = ["pending", "accepted", "rejected"];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ message: "Invalid status value" });
            }

            try {
                // const objectId = await new ObjectId(id);

                const proposal = await proposalCollection.findOne({ _id: id });

                if (!proposal) {
                    return res.status(404).json({
                        message: "Proposal not found",
                        id,
                    });
                }

                const result = await proposalCollection.updateOne(
                    { _id: id },
                    { $set: { status } }
                );

                res.json({
                    message: "Updated successfully",
                    modifiedCount: result.modifiedCount,
                });

            } catch (error) {
                console.log(error);
                res.status(500).json({ message: "Server error" });
            }
        });

        app.get('/myProposals/:id', async (req, res) => {
            const id = req.params.id;
            const result = await proposalCollection.find({ FreelancerId: id }).toArray();
            res.send(result);
        });
        app.get('/ClintProposals/:id', async (req, res) => {
            const id = req.params.id;
            const result = await proposalCollection.find({ ClientId: id }).toArray();
            res.send(result);
        });

        app.get("/proposalTaskid/:id", async (req, res) => {
            try {
                const { id } = req.params;

                // উদাহরণ ডাটাবেস কল (MongoDB ধরলাম)
                const data = await proposalCollection.findOne({ _id: id });

                if (!data) {
                    return res.status(404).json({ message: "Data not found" });
                }

                res.json(data);
            } catch (error) {
                res.status(500).json({ message: "Server error", error });
            }
        });













        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})