const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
require('dotenv').config();
app.use(cors());
const port = process.env.PORT;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const uri = process.env.MONGODB_URI;



const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// const jwks = createRemoteJWKSet(new URL(`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/auth/jwks`));

// const verifyToken = async (req, res, next) => {
//     const authHeader = req.headers.authorization;
//     console.log("authheader", authHeader)
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//         return res.status(401).json({ message: "Unauthorized: Token not found" });
//     }

//     const token = authHeader.split(" ")[1];
//     console.log(token);

//     try {
//         const { payload } = await jwtVerify(token, jwks);
//         req.user = payload;
//         next();
//     } catch (error) {
//         console.log(error);
//         return res.status(401).json({ message: "Unauthorized: Invalid token" });
//     }
// };

module.exports = app;

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
        // NOTE: TaskCollection ছিল TasksCollection-এর duplicate reference, একটাই রাখা হলো।
        // আগে যেখানে TaskCollection ব্যবহার হয়েছিল সেগুলো TasksCollection-এ পয়েন্ট করানো হয়েছে।

        app.get("/alluserusers", async (req, res) => {
            try {
                const result = await UserCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.get("/alltask", async (req, res) => {
            try {
                const result = await TasksCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.get("/allpayment", async (req, res) => {
            try {
                const result = await PaymentsCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.get("/allproposals", async (req, res) => {
            try {
                const result = await proposalCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

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
            try {
                const task = req.body;
                const result = await TasksCollection.insertOne(task);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
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
            try {
                const id = req.params.id;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid task id" });
                }

                const result = await TasksCollection.findOne({ _id: new ObjectId(id) });

                if (!result) {
                    return res.status(404).send({ message: "Task not found" });
                }

                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });























        //clint
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
                if (!ObjectId.isValid(taskId)) {
                    return res.status(400).json({ message: "Invalid task id" });
                }

                const task = await TasksCollection.findOne({ _id: new ObjectId(taskId) });

                if (!task) {
                    return res.status(404).json({
                        message: "Task not found",
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
                console.error(error);
                res.status(500).json({ message: "Server error" });
            }
        });

        app.delete("/deleteclinttask/:id", async (req, res) => {
            try {
                const id = req.params.id;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid task id" });
                }

                const result = await TasksCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        // proposal related funtion

        app.post('/proposals', async (req, res) => {
            try {
                const proposal = req.body;
                const result = await proposalCollection.insertOne(proposal);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
        });

        app.delete("/proposals/:id", async (req, res) => {
            try {
                const { id } = req.params;

                // NOTE: proposalCollection-e _id plain string hisebe save hoy (ObjectId na),
                // tai ObjectId.isValid() check kora thik hobe na — sothik id soja string e query kora hocche.
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
                console.error(error);
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
            try {
                const id = req.params.id;
                const result = await proposalCollection.find({ ClientId: id }).toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Server error" });
            }
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
                console.error(error);
                res.status(500).json({ message: "Server error" });
            }
        });

        app.get("/admin/users", async (req, res) => {
            // NOTE: 'limite' spelling icche kore rakha hocche, frontend already eta use kore.
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
            // NOTE: 'limite' spelling icche kore rakha hocche, frontend already eta use kore.
            const { page = 1, limite = 10 } = req.query;
            const skip = (Number(page) - 1) * Number(limite);

            try {
                const total = await TasksCollection.countDocuments({});
                const result = await TasksCollection.find({})
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
        // NOTE: ei route ti age duibar define kora thakto (jeita uporer thakto setai junk hoye
        // jeto, karon nicher generic version-i kaj korto). Ekhon merge kore ekta version e
        // rakha holo: jodi specific fields (title/bio/hourlyRate/location/skills/category)
        // pathano hoy, sheigulo validate/convert kora hoy; baki extra field thakle (...rest)
        // shegulo o spread kore set kora hoy — flexible thakar jonno.
        app.patch("/users/:id/profile", async (req, res) => {
            try {
                const { id } = req.params;
                const { title, bio, hourlyRate, location, skills, category, ...rest } = req.body;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid user id",
                    });
                }

                const updateFields = {
                    ...rest,
                    updatedAt: new Date(),
                };

                if (title !== undefined) updateFields.title = title;
                if (bio !== undefined) updateFields.bio = bio;
                if (location !== undefined) updateFields.location = location;
                if (skills !== undefined) updateFields.skills = skills;
                if (category !== undefined) updateFields.category = category;
                if (hourlyRate !== undefined) updateFields.hourlyRate = Number(hourlyRate);

                const result = await UserCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateFields }
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
                    matchedCount: result.matchedCount,
                    modifiedCount: result.modifiedCount,
                });
            } catch (error) {
                console.error("Profile Update Error:", error);
                res.status(500).send({
                    success: false,
                    message: error.message,
                });
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

        // payment related kaj

        app.post('/payments', async (req, res) => {
            try {
                const {
                    session_id,
                    ClientId,
                    Clintemail,
                    Freelancer,
                    FreelancerId,
                    ProposedId,
                    price,
                    title
                } = req.body;

                if (!session_id) {
                    return res.status(400).json({ message: 'session_id is required' });
                }

                const existing = await PaymentsCollection.findOne({ session_id });
                if (existing) {
                    return res.status(200).json({
                        message: 'Payment already recorded',
                        alreadyExists: true
                    });
                }

                const result = await PaymentsCollection.insertOne({
                    session_id,
                    ClientId,
                    Clintemail,
                    Freelancer,
                    FreelancerId,
                    ProposedId,
                    price,
                    title,
                    createdAt: new Date()
                });

                res.status(201).json({
                    message: 'Payment recorded successfully',
                    insertedId: result.insertedId
                });
            } catch (error) {
                console.error('Error saving payment:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        app.get("/pendingProposalsByClient/:clientId", async (req, res) => {
            const clientId = req.params.clientId;
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


        app.put("/updateclinttask/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updatedTask = req.body;

                const updateDoc = {
                    $set: {
                        title: updatedTask.title,
                        category: updatedTask.category,
                        description: updatedTask.description,
                        budget: updatedTask.budget,
                        deadline: updatedTask.deadline,
                        // ClientId বা Email সাধারণত আপডেট করা হয় না, তাই এগুলো সেট করিনি
                    },
                };

                const result = await TasksCollection.updateOne(filter, updateDoc);

                if (result.modifiedCount > 0) {
                    res.send({ success: true, message: "Task updated successfully" });
                } else {
                    res.status(400).send({ success: false, message: "No changes made" });
                }
            } catch (error) {
                console.error("Update error:", error);
                res.status(500).send({ message: "Internal server error" });
            }
        });



        // Express.js API
        app.delete('/api/admin/users/:id', async (req, res) => {
            try {
                const { id } = req.params;

                // MongoDB Mongoose ডিলিট অপারেশন
                const result = await User.findByIdAndDelete(id);

                if (!result) {
                    return res.status(404).json({
                        success: false,
                        message: "User not found in database!"
                    });
                }

                res.status(200).json({
                    success: true,
                    message: "User deleted permanently from collection."
                });
            } catch (error) {
                console.error("Delete API Error:", error);
                res.status(500).json({ success: false, message: "Internal server error" });
            }
        });

















        app.get('/', (req, res) => {
            res.send('Hello World!');
        });




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});