const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
require('dotenv').config();
app.use(cors());
const port = process.env.PORT;
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
        const UserCollection = db.collection("user");


        app.get("/users/:id", async (req, res) => {
            const id = req.params.id;
            const result = await UserCollection.findOne({ _id: new ObjectId(id) })
            res.send(result)
        })


        app.get("/freelancers", async (req, res) => {
            try {
                const search = req.query.search || "";
                const minBudgetFrom = req.query.minBudgetFrom;
                const minBudgetTo = req.query.minBudgetTo;

                const query = {
                    role: "freelancer", 
                };

                if (search) {
                    query.name = { $regex: search, $options: "i" };
                }

                if (minBudgetFrom || minBudgetTo) {
                    query.minBudget = {};

                    if (minBudgetFrom) {
                        query.minBudget.$gte = Number(minBudgetFrom);
                    }

                    if (minBudgetTo) {
                        query.minBudget.$lte = Number(minBudgetTo);
                    }
                }

                const result = await UserCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });






        // task related funtion
        app.post('/tasks', async (req, res) => {
            const task = req.body;
            const result = await TasksCollection.insertOne(task);
            res.send(result);
        });
       

        app.get('/tasks', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 0; // 0 মানে limit নেই
                const skip = parseInt(req.query.skip) || 0;
                const search = req.query.search || "";
                const category = req.query.category || "";

                // query object
                const query = {};

                if (search) {
                    // title-এ case-insensitive search
                    query.title = { $regex: search, $options: "i" };
                }

                if (category && category !== "All") {
                    query.category = category;
                }

                const result = await TasksCollection
                    .find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
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

            const allowedStatuses = ["booked", "submited"];

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

        app.delete("/proposals/:id", async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid proposal id",
                    });
                }


                const result = await proposalCollection.deleteOne({ _id: id });

                if (result.deletedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "Proposal not found",
                    });
                }

                res.send({
                    success: true,
                    message: "Proposal deleted successfully",
                    deletedCount: result.deletedCount,
                });

            } catch (error) {
                console.error(error);
                res.status(500).send({
                    success: false,
                    message: "Server error",
                });
            }
        });


        app.patch("/task/proposals/:id", async (req, res) => {
            const { id } = req.params;

            const { status, submitDate } = req.body;

            const allowedStatuses = ["pending", "accepted", "rejected", "submited"];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid status value",
                });
            }

            try {
                const proposal = await proposalCollection.findOne({ _id: id });

                if (!proposal) {
                    return res.status(404).json({
                        message: "Proposal not found",
                        id,
                    });
                }

                const updateDoc = {
                    $set: {
                        status,
                    },
                };

                if (status === "submited") {
                    updateDoc.$set.submitDate = submitDate || new Date().toISOString();
                }

                const result = await proposalCollection.updateOne(
                    { _id: id },
                    updateDoc
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
                const data = await proposalCollection.findOne({ _id: id });

                if (!data) {
                    return res.status(404).json({ message: "Data not found" });
                }

                res.json(data);
            } catch (error) {
                res.status(500).json({ message: "Server error", error });
            }
        });


        app.get("/admin/users", async (req, res) => {
            try {
                const result = await UserCollection.find({
                    role: { $in: ["client", "freelancer"] },
                }).toArray();

                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        // Block / Unblock  route
        app.patch("/admin/users/:id/block", async (req, res) => {
            try {
                const { id } = req.params;
                const { isBlocked } = req.body; // true অথবা false

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid user id",
                    });
                }

                const result = await UserCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { isBlocked: Boolean(isBlocked) } }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "User not found",
                    });
                }

                res.send({
                    success: true,
                    message: isBlocked
                        ? "User blocked successfully"
                        : "User unblocked successfully",
                    modifiedCount: result.modifiedCount,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });


        app.get("/admin/tasks", async (req, res) => {
            try {
                const result = await TasksCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        // Task delete 
        app.delete("/admin/tasks/:id", async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid task id",
                    });
                }

                const result = await TasksCollection.deleteOne({
                    _id: new ObjectId(id),
                });

                if (result.deletedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "Task not found",
                    });
                }

                res.send({
                    success: true,
                    message: "Task deleted successfully",
                    deletedCount: result.deletedCount,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.patch("/admin/tasks/:id/status", async (req, res) => {
            try {
                const { id } = req.params;
                const { status } = req.body;

                const allowedStatuses = ["open", "booked", "submited"];

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid task id",
                    });
                }

                if (!allowedStatuses.includes(status)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid status value",
                    });
                }

                const result = await TasksCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status } }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "Task not found",
                    });
                }

                res.send({
                    success: true,
                    message: "Status updated successfully",
                    modifiedCount: result.modifiedCount,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.patch("/admin/tasks/:id/feature", async (req, res) => {
            try {
                const { id } = req.params;
                const { isFeatured } = req.body;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid task id",
                    });
                }

                const result = await TasksCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { isFeatured: Boolean(isFeatured) } }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "Task not found",
                    });
                }

                res.send({
                    success: true,
                    message: isFeatured
                        ? "Task featured successfully"
                        : "Task unfeatured successfully",
                    modifiedCount: result.modifiedCount,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.get("/admin/proposals", async (req, res) => {
            try {
                const result = await proposalCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });


        // freelancer actions
        app.get("/users/:id", async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid user id" });
                }

                const user = await UserCollection.findOne({ _id: new ObjectId(id) });

                if (!user) {
                    return res.status(404).send({ message: "User not found" });
                }

                res.send(user);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });



        app.patch("/users/:id/profile", async (req, res) => {
            try {
                const { id } = req.params;
                const { title, bio, hourlyRate, location, skills, category } = req.body;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid user id",
                    });
                }

                const updateDoc = {
                    $set: {
                        title,
                        bio,
                        hourlyRate: Number(hourlyRate),
                        location,
                        skills,
                        category,
                        updatedAt: new Date(),
                    },
                };

                const result = await UserCollection.updateOne(
                    { _id: new ObjectId(id) },
                    updateDoc
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "User not found",
                    });
                }

                res.send({
                    success: true,
                    message: "Profile updated successfully",
                    modifiedCount: result.modifiedCount,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
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