const cheerio = require("cheerio");
const { CrawlingAPI } = require("crawlbase");
const fs = require("fs");
const path = require("path");
const axios = require('axios');
require("dotenv").config();

const api = new CrawlingAPI({ token: process.env.TOKEN });

// Function to save data to JSON file
function saveToJsonFile(data) {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    let cleanProductName = data.productName.replace(/ Reviews$/i, '');
    const sanitizedProductName = cleanProductName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sanitizedProductName}_${timestamp}.json`;
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { filePath, filename };
}

// Function to extract reviews from Trustpilot
async function extractReviewsFromTrustpilot(pageUrl) {
    const headers = { 'User-Agent': 'Mozilla/5.0' };
    try {
        const response = await axios.get(pageUrl, { headers });
        const $ = cheerio.load(response.data);
        const reviewsData = [];
        $('article[data-service-review-card-paper="true"]').each((index, article) => {
            const reviewText = $(article).find('p[data-service-review-text-typography="true"]').text().trim();
            const reviewDate = $(article).find('time').text().trim();
            const rating = $(article).find('div[data-service-review-rating="true"]').attr('data-service-review-rating');
            reviewsData.push({
                'Review Text': reviewText,
                'Review Date': reviewDate,
                'Rating': rating,
            });
        });
        return reviewsData;
    } catch (error) {
        console.error('Error fetching page from Trustpilot:', error);
        return [];
    }
}

// Function to extract reviews from multiple pages of Trustpilot
async function extractAllReviewsFromTrustpilot(baseUrl, fromPage = 1, toPage = 6) {
    const allReviews = [];
    for (let page = fromPage; page <= toPage; page++) {
        const pageUrl = `${baseUrl}?page=${page}`;
        console.log(`Scraping: ${pageUrl}`);
        const reviews = await extractReviewsFromTrustpilot(pageUrl);
        allReviews.push(...reviews);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Sleep to avoid throttling
    }
    return allReviews;
}

// Function to filter reviews by date range
function filterReviewsByDate(reviews, start_date, end_date) {
    const filteredReviews = reviews.filter(review => {
        const reviewDate = new Date(review['Review Date']);
        return reviewDate >= new Date(start_date) && reviewDate <= new Date(end_date);
    });
    return filteredReviews;
}

// Function to handle reviews for G2, Capterra, and Trustpilot
async function scrapeReviewsForSite(url, start_date, end_date) {
    let result;
    if (url.toLowerCase().includes('capterra')) {
        // Handle scraping for Capterra (as per previous Capterra scraping code)
        result = await scrapeAndFilterReviews_Capterra(url, start_date, end_date);
    } else if (url.toLowerCase().includes('g2')) {
        // Handle scraping for G2 (as per previous G2 scraping code)
        result = await scrapeAllPages_G2(url);
        result.allReviews = filterReviewsByDate(result.allReviews, start_date, end_date);
        result.totalScrapedReviews = result.allReviews.length;
    } else if (url.toLowerCase().includes('trustpilot')) {
        // Handle scraping for Trustpilot using your existing logic
        const allReviews = await extractAllReviewsFromTrustpilot(url);
        result = {
            productName: 'Trustpilot Reviews', // Default for Trustpilot
            totalReviews: allReviews.length,
            allReviews: allReviews,
        };
        result.allReviews = filterReviewsByDate(result.allReviews, start_date, end_date);
        result.totalScrapedReviews = result.allReviews.length;
    } else {
        console.error("Unsupported URL. Please provide a URL from G2, Capterra, or Trustpilot.");
        return null;
    }

    return result;
}

// Main function to run the scraper
async function main() {
    try {
        const inputFilePath = path.join(__dirname, 'input.json');
        if (!fs.existsSync(inputFilePath)) {
            console.error("Input file not found: input.json");
            process.exit(1);
        }
        const inputData = JSON.parse(fs.readFileSync(inputFilePath, 'utf8'));
        const { url, start_date, end_date } = inputData;
        if (!url || !start_date || !end_date) {
            console.error("Input JSON file must include 'url', 'start_date', and 'end_date'");
            process.exit(1);
        }

        let result = await scrapeReviewsForSite(url, start_date, end_date);
        if (!result) {
            console.error("Failed to scrape data");
            process.exit(1);
        }

        const fileInfo = saveToJsonFile(result);
        console.log("Scraping complete.");
        console.log("Product Name:", result.productName);
        console.log("Total Reviews (from the website):", result.totalReviews);
        console.log("Scraped Reviews Count (after filtering):", result.totalScrapedReviews);
        console.log("Output file saved to:", fileInfo.filePath);
    } catch (error) {
        console.error("Error during scraping:", error);
        process.exit(1);
    }
}

main();
