const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

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
async function extractReviews(pageUrl) {
  const headers = { 'User-Agent': 'Mozilla/5.0' }; // Mimic a browser
  try {
    const response = await axios.get(pageUrl, { headers });
    const $ = cheerio.load(response.data);

    const reviewsData = [];
    $('article[data-service-review-card-paper="true"]').each((index, article) => {
      let reviewText = null;
      let reviewDate = null;
      let rating = null;

      const textTag = $(article).find('p[data-service-review-text-typography="true"]');
      if (textTag) {
        reviewText = textTag.text().trim();
      }

      const timeTag = $(article).find('time');
      if (timeTag) {
        reviewDate = timeTag.text().trim();
      }

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

// Function to extract reviews from multiple pages
async function extractAllReviews(baseUrl, fromPage = 1, toPage = 6) {
  const allReviews = [];
  for (let page = fromPage; page <= toPage; page++) {
    const pageUrl = `${baseUrl}?page=${page}`;
    console.log(`Scraping: ${pageUrl}`);
    const reviews = await extractReviews(pageUrl);
    allReviews.push(...reviews);
    await sleep(1000); // Pause to avoid throttling
  }
  return allReviews;
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract company name from the base URL
function extractCompanyName(url) {
  const match = url.match(/\/review\/([^/?]+)/);
  return match ? match[1].replace(/\./g, '_') : 'unknown_company';
}

// Ensure the output directory exists
function ensureOutputDir() {
  const dir = path.join(__dirname, 'output');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return dir;
}

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
  const outputDir = ensureOutputDir();
  const outputFilePath = path.join(outputDir, `${companyName}-${timestamp}.json`);

  fs.writeFileSync(outputFilePath, JSON.stringify(reviews, null, 2));
  console.log(`Reviews saved to ${outputFilePath}`);
})();
