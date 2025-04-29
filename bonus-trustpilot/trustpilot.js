const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

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

// Parse command-line arguments
const baseUrl = process.argv[2];
const fromPage = parseInt(process.argv[3], 10) || 1;
const toPage = parseInt(process.argv[4], 10) || 6;

if (!baseUrl) {
  console.log('Please provide a base URL as the first argument.');
  process.exit(1);
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

(async () => {
  const reviews = await extractAllReviews(baseUrl, fromPage, toPage);
  const companyName = extractCompanyName(baseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // safe for filenames
  const outputDir = ensureOutputDir();
  const outputFilePath = path.join(outputDir, `${companyName}-${timestamp}.json`);

  fs.writeFileSync(outputFilePath, JSON.stringify(reviews, null, 2));
  console.log(`✅ Reviews saved to ${outputFilePath}`);
})();
