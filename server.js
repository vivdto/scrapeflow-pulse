const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const { scrapeReviewsForSite, saveToJsonFile } = require("./scrapper");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// API route
app.post("/api/scrape", async (req, res) => {
    const { url, startDate, endDate } = req.body;

    try {
        const result = await scrapeReviewsForSite(url, startDate, endDate);
        const { filePath, filename } = saveToJsonFile(result);
        console.log(`Output file saved to: ${filePath}`);
        res.json({ message: "Scraping completed", filename, total: result.totalScrapedReviews });
    } catch (error) {
        console.error("Scraping failed:", error);
        res.status(500).json({ error: error.message || "Scraping failed" });
    }
});

// Fallback to frontend
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
