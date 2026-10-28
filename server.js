
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");
const expenseRoutes = require("./routes/expenseRoutes");
const Feedback = require("./models/Feedback");

const app = express();
const PORT = process.env.PORT || 3000;

const configPath = path.join(__dirname, "config.yaml");
const config = yaml.load(fs.readFileSync(configPath, "utf8"));

console.log("Configuration loaded:", config.app.name);

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
    console.log("REQUEST RECEIVED:", req.method, req.url);
    next();
});

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "lifeassist-development-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 30 * 60 * 1000
        }
    })
);

// Serve frontend and XML files
app.use(express.static(path.join(__dirname, "public")));
app.use("/xml", express.static(path.join(__dirname, "xml")));

// Expense routes
app.use("/api/expenses", expenseRoutes);

// Session test route
app.get("/api/session-test", (req, res) => {
    if (!req.session.visitCount) {
        req.session.visitCount = 1;
    } else {
        req.session.visitCount++;
    }

    res.json({
        success: true,
        message: "LifeAssist session is working!",
        visitCount: req.session.visitCount
    });
});
// Initial data for HTTP methods demonstration
let httpDemoItem = {
    id: 1,
    message: "LifeAssist HTTP demo"
};
// Backend status route
app.get("/api/status", (req, res) => {
    res.status(200).json({
        success: true,
        message: "LifeAssist backend is running successfully!"
    });
});



app.get("/api/http-demo", (req, res) => {
    if (!httpDemoItem) {
        return res.status(404).json({
            message: "Item not found"
        });
    }
    res.status(200).json(httpDemoItem);
});

app.post("/api/http-demo", (req, res) => {
    httpDemoItem = {
        id: Date.now(),
        message: req.body?.message || "Created using POST"
    };

    res.status(201).json({
        message: "Resource created",
        data: httpDemoItem
    });
});

app.put("/api/http-demo", (req, res) => {
    if (!httpDemoItem) {
        return res.status(404).json({
            message: "Item not found"
        });
    }

    httpDemoItem.message =
        req.body?.message || "Updated using PUT";

    res.status(200).json({
        message: "Resource updated",
        data: httpDemoItem
    });
});

app.delete("/api/http-demo", (req, res) => {
    if (!httpDemoItem) {
        return res.status(404).json({
            message: "Item not found"
        });
    }

    httpDemoItem = null;
    res.status(204).end();
});

app.get("/api/http-check", (req, res) => {
    res.status(200).json({
        success: true,
        message: "HTTP demo route is working!"
    });
});

app.post("/api/feedback", async (req, res) => {
    try {
        const { name, email, rating, feedback } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof feedback !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !feedback.trim() ||
            ![1, 2, 3, 4, 5].includes(Number(rating))
        ) {
            return res.status(400).json({
                success: false,
                message: "Please complete all fields correctly."
            });
        }

        const savedFeedback = await Feedback.create({
            name: name.trim(),
            email: email.trim(),
            rating: Number(rating),
            feedback: feedback.trim()
        });

        res.status(201).json({
            success: true,
            message: "Feedback saved successfully!",
            id: savedFeedback._id
        });
    } catch (error) {
        console.error("Feedback save error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to save feedback."
        });
    }
});

// Module 6: Cookies demonstration
app.get("/api/cookie-demo", (req, res) => {
    res.cookie("lifeassistVisit", "visited", {
        httpOnly: true,
        maxAge: 60 * 60 * 1000,
        sameSite: "lax"
    });

    res.json({
        message: "Cookie created successfully!",
        cookie: "lifeassistVisit"
    });
});

app.get("/api/cookie-check", (req, res) => {
    res.json({
        cookieValue: req.cookies.lifeassistVisit || "Cookie not found"
    });
});
// Module 6: Callback demonstration
app.get("/api/callback-demo", (req, res) => {
    function processMessage(message, callback) {
        callback(message);
    }

    processMessage("LifeAssist callback is working!", (result) => {
        res.json({
            success: true,
            topic: "Callbacks",
            message: result
        });
    });
});
// Connect to MongoDB and start the server
async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully!");

        app.listen(PORT, () => {
            console.log(
                `LifeAssist server running at http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "MongoDB connection failed:",
            error.message
        );
    }
}

startServer();
