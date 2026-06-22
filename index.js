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
        const PaymentsCollection = db.collection("Payments");
        const TaskCollection = db.collection("Tasks");


        app.get("/alluserusers", async (req, res) => {
            const id = req.params.id;
            const result = await UserCollection.find()
            res.send(result)
        })
        app.get("/alltask", async (req, res) => {
            const id = req.params.id;
            const result = await TaskCollection.find()
            res.send(result)
        })
        app.get("/allpayment", async (req, res) => {
            const id = req.params.id;
            const result = await PaymentsCollection.find()
            res.send(result)
        })
        app.get("/allproposals", async (req, res) => {
            const id = req.params.id;
            const result = await proposalCollection.find()
            res.send(result)
        })


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
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const query = {
                    role: "freelancer",
                };

                if (search) {
                    query.name = { $regex: search, $options: "i" };
                }

                // hourlyRate filter — budget range er moddhe freelancer er hourlyRate thakle dekhabe
                if (minBudgetFrom || minBudgetTo) {
                    query.hourlyRate = {};

                    if (minBudgetFrom) {
                        query.hourlyRate.$gte = Number(minBudgetFrom);
                    }

                    if (minBudgetTo) {
                        query.hourlyRate.$lte = Number(minBudgetTo);
                    }
                }

                const totalItems = await UserCollection.countDocuments(query);
                const totalPages = Math.ceil(totalItems / limit);

                const result = await UserCollection.find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    freelancers: result,
                    totalItems,
                    totalPages,
                    currentPage: page,
                    itemsPerPage: limit,
                });
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

                const query = {
                    status: "open" // শুধু open task দেখাবে
                };

                if (search) {
                    query.title = { $regex: search, $options: "i" };
                }

                if (category && category !== "All") {
                    query.category = category;
                }

                const totalCount = await TasksCollection.countDocuments(query);

                const result = await TasksCollection
                    .find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    tasks: result,
                    totalCount
                });
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
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 2;
            const skip = (page - 1) * limit;

            try {
                const query = { ClientId: clientId };

                const totalItems = await TasksCollection.countDocuments(query);
                const result = await TasksCollection.find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    tasks: result,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                    currentPage: page,
                    itemsPerPage: limit,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.patch("/updatetaskstatus/:taskId", async (req, res) => {
            const { taskId } = req.params;
            const { status, submitionLink, submitionMessage } = req.body;

            const allowedStatuses = ["booked", "submited"];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ message: "Invalid status value" });
            }

            try {
                const task = await TasksCollection.findOne({ _id: new ObjectId(taskId) });
                const proposal = await proposalCollection.findOne({ _id: taskId });
                console.log("tproposal for proposal", proposal)

                if (!task) {
                    return res.status(404).json({
                        message: "Proposal not found",
                        id: taskId,
                    });
                }

                // একটাই $set object বানালাম, যেখানে link/message থাকলেই add হবে
                const updateFields = { status };
                if (submitionLink !== undefined) updateFields.submitionLink = submitionLink;
                if (submitionMessage !== undefined) updateFields.submitionMessage = submitionMessage;

                const result = await TasksCollection.updateOne(
                    { _id: new ObjectId(taskId) },
                    { $set: updateFields }
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
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 2;
            const skip = (page - 1) * limit;

            try {
                const query = { FreelancerId: id };

                const totalItems = await proposalCollection.countDocuments(query);
                const result = await proposalCollection.find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    proposals: result,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                    currentPage: page,
                    itemsPerPage: limit,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.get('/myActiveProposals/:id', async (req, res) => {
            const id = req.params.id;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            try {
                const query = {
                    FreelancerId: id,
                    status: "accepted",
                };

                const totalItems = await proposalCollection.countDocuments(query);
                const result = await proposalCollection.find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    proposals: result,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                    currentPage: page,
                    itemsPerPage: limit,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
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
            const { page = 1, limite = 10 } = req.query;
            const skip = (Number(page) - 1) * Number(limite);

            try {
                const query = { role: { $in: ["client", "freelancer"] } };

                const total = await UserCollection.countDocuments(query);
                const result = await UserCollection.find(query).skip(skip).limit(Number(limite)).toArray();

                res.send({
                    users: result,
                    total,
                    totalPages: Math.ceil(total / Number(limite)),
                });
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
            const { page = 1, limite = 10 } = req.query;
            const skip = (Number(page) - 1) * Number(limite);

            try {
                const total = await TaskCollection.countDocuments({});
                const result = await TaskCollection.find({})
                    .skip(skip)
                    .limit(Number(limite))
                    .toArray();

                res.send({
                    tasks: result,
                    total,
                    totalPages: Math.ceil(total / Number(limite)),
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.get("/admin/transactions", async (req, res) => {
            const { page = 1, limite = 10 } = req.query;
            const skip = (Number(page) - 1) * Number(limite);

            try {
                const total = await PaymentsCollection.countDocuments({});
                const result = await PaymentsCollection.find({})
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limite))
                    .toArray();

                res.send({
                    transactions: result,
                    total,
                    totalPages: Math.ceil(total / Number(limite)),
                });
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

        app.patch("/users/:id/increment-submission", async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid user id",
                    });
                }

                const result = await UserCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $inc: { totalJobsSubmitted: 1 } } // 👈 na thakle 1 hobe, thakle +1 hobe
                );

                if (result.matchedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "User not found",
                    });
                }

                res.send({
                    success: true,
                    message: "Submission count updated",
                    modifiedCount: result.modifiedCount,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        //payment related kaj



        app.post('/payments', async (req, res) => {
            try {
                const {
                    session_id,
                    ClientId,
                    Clintemail,
                    Freelancer,
                    FreelancerId,   // 👈 add koro
                    ProposedId,
                    price,
                    title
                } = req.body

                if (!session_id) {
                    return res.status(400).json({ message: 'session_id is required' })
                }

                const existing = await PaymentsCollection.findOne({ session_id })
                if (existing) {
                    return res.status(200).json({
                        message: 'Payment already recorded',
                        alreadyExists: true
                    })
                }

                const result = await PaymentsCollection.insertOne({
                    session_id,
                    ClientId,
                    Clintemail,
                    Freelancer,
                    FreelancerId,   // 👈 add koro
                    ProposedId,
                    price,
                    title,
                    createdAt: new Date()
                })

                res.status(201).json({
                    message: 'Payment recorded successfully',
                    insertedId: result.insertedId
                })
            } catch (error) {
                console.log('Error saving payment:', error)
                res.status(500).json({ message: 'Internal server error' })
            }
        })

        app.get("/pendingProposalsByClient/:clientId", async (req, res) => {
            const clientId = req.params.clientId;
            console.log(clientId)
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            try {
                const query = {
                    ClientId: clientId,
                    status: "pending",
                };

                const totalItems = await proposalCollection.countDocuments(query);
                const result = await proposalCollection.find(query)
                    .sort({ _id: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    proposals: result,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                    currentPage: page,
                    itemsPerPage: limit,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });





        app.get("/myFreelancerTransactions/:freelancerId", async (req, res) => {
            const freelancerId = req.params.freelancerId;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            try {
                const query = { FreelancerId: freelancerId };

                const totalItems = await PaymentsCollection.countDocuments(query);
                const result = await PaymentsCollection.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    transactions: result,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit),
                    currentPage: page,
                    itemsPerPage: limit,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });


       app.patch("/users/:id/profile", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const updateFields = {
      ...body,
      updatedAt: new Date(),
    };

    if (body.hourlyRate !== undefined) {
      updateFields.hourlyRate = Number(body.hourlyRate);
    }

    const result = await UserCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Profile Update Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
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

