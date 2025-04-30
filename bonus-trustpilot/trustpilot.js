const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

<<<<<<< HEAD
// Function to read input from input.json
function readInputFile() {
  const inputFilePath = path.join(__dirname, 'input.json');
  if (!fs.existsSync(inputFilePath)) {
    console.log('input.json file not found!');
    process.exit(1);
  }

  const inputData = fs.readFileSync(inputFilePath, 'utf-8');
  return JSON.parse(inputData);
}

// Function to extract reviews from a page
=======
// Function to extract reviews from a single Trustpilot page
>>>>>>> 7ca30c9bc729da20727b6173470a993c24aee476
async function extractReviews(pageUrl) {
  const headers = { 'User-Agent': 'Mozilla/5.0' }; // Mimic a browser to avoid request blocking
  try {
    const response = await axios.get(pageUrl, { headers });
    const $ = cheerio.load(response.data);

    const reviewsData = [];
    $('article[data-service-review-card-paper="true"]').each((index, article) => {
      let reviewText = null;
      let reviewDate = null;
      let rating = null;

      // Extract review text
      const textTag = $(article).find('p[data-service-review-text-typography="true"]');
      if (textTag) {
        reviewText = textTag.text().trim();
      }

      // Extract review date
      const timeTag = $(article).find('time');
      if (timeTag) {
        reviewDate = timeTag.text().trim();
      }

      // Extract rating (stored in attribute)
      const headerDiv = $(article).find('div[data-service-review-rating="true"]');
      if (headerDiv) {
        rating = headerDiv.attr('data-service-review-rating');
      }

      reviewsData.push({
        'Review Text': reviewText,
        'Review Date': reviewDate,
        'Rating': rating,
      });
    });

    return reviewsData;
  } catch (error) {
    console.error('Error fetching page:', error.message);
    return [];
  }
}

// Function to extract reviews across multiple paginated pages
async function extractAllReviews(baseUrl, fromPage = 1, toPage = 6) {
  const allReviews = [];
  for (let page = fromPage; page <= toPage; page++) {
    const pageUrl = `${baseUrl}?page=${page}`;
    console.log(`Scraping: ${pageUrl}`);
    const reviews = await extractReviews(pageUrl);
    allReviews.push(...reviews);
    await sleep(1000); // Wait 1 second between requests to avoid getting blocked
  }
  return allReviews;
}

// Utility function to pause execution
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

<<<<<<< HEAD
// Extract company name from the base URL
=======
// Command-line argument parsing
const baseUrl = process.argv[2];
const fromPage = parseInt(process.argv[3], 10) || 1;
const toPage = parseInt(process.argv[4], 10) || 6;

if (!baseUrl) {
  console.log('Please provide a base URL as the first argument.');
  process.exit(1);
}

// Extract company name from URL for use in filename
>>>>>>> 7ca30c9bc729da20727b6173470a993c24aee476
function extractCompanyName(url) {
  const match = url.match(/\/review\/([^/?]+)/);
  return match ? match[1].replace(/\./g, '_') : 'unknown_company';
}

// Create output directory if it doesn't exist
function ensureOutputDir() {
  const dir = path.join(__dirname, 'output');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return dir;
}

<<<<<<< HEAD
// Main logic to extract reviews
(async () => {
  const { url, start_date, end_date } = readInputFile(); // Read from input.json

  if (!url) {
    console.log('Please provide a URL in input.json.');
    process.exit(1);
  }

  console.log(`Scraping reviews from: ${url}`);
  console.log(`Date Range: ${start_date} to ${end_date}`);

  // Here you would modify your review extraction logic to filter based on the date range
  const reviews = await extractAllReviews(url); // You can modify this function to filter by dates if needed

  const companyName = extractCompanyName(url);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // safe for filenames
=======
// Main IIFE to run the scraper
(async () => {
  const reviews = await extractAllReviews(baseUrl, fromPage, toPage);
  const companyName = extractCompanyName(baseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Timestamp safe for filenames
>>>>>>> 7ca30c9bc729da20727b6173470a993c24aee476
  const outputDir = ensureOutputDir();
  const outputFilePath = path.join(outputDir, `${companyName}-${timestamp}.json`);

  fs.writeFileSync(outputFilePath, JSON.stringify(reviews, null, 2));
  console.log(`Reviews saved to ${outputFilePath}`);
})();
