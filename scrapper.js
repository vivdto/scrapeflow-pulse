// Required dependencies
const cheerio = require("cheerio"); // For HTML parsing
const { CrawlingAPI } = require("crawlbase"); // Crawlbase client for scraping
const fs = require("fs"); // File system module for reading/writing files
const path = require("path"); // Path utilities
require("dotenv").config(); // Load environment variables from .env file

// Initialize Crawlbase API with token from environment variables
const api = new CrawlingAPI({ token: process.env.TOKEN });

/**
 * Saves the scraped data to a JSON file in the /output directory
 */
function saveToJsonFile(data) {
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    // Create a sanitized and timestamped filename
    let cleanProductName = data.productName.replace(/ Reviews$/i, '');
    const sanitizedProductName = cleanProductName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sanitizedProductName}_${timestamp}.json`;
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { filePath, filename };
}

/**
 * Parses reviews and product info from G2 HTML page
 */
function parsedDataFromHTML_G2(html) {
    try {
        const $ = cheerio.load(html);
        const productData = {
            productName: "",
            stars: "",
            totalReviews: "",
            allReviews: [],
        };

        // Extract basic product info
        productData.productName = $("div.product-head__title a.c-midnight-100").text();
        productData.stars = $("#products-dropdown .fw-semibold").first().text();
        productData.totalReviews = $(".filters-product h3").text();

        // Check if there's a next page
        const paginationText = $(".pagination").text();
        const hasNextPage = paginationText.includes("Next");

        // Parse each review
        $(".nested-ajax-loading > div.paper").each((_, element) => {
            const reviewerName = $(element).find("[itemprop=author]").text();
            const stars = $(element).find("[itemprop='ratingValue']").attr("content");
            const reviewText = $(element).find(".pjax").text().replace(/[^a-zA-Z ]/g, "");
            const reviewLink = $(element).find(".pjax").attr("href");
            const profileTitle = $(element).find(".mt-4th").map((_, label) => $(label).text()).get();
            const reviewDate = $(element).find("time").text();
            productData.allReviews.push({
                reviewerName,
                reviewText,
                stars,
                profileTitle: profileTitle.length ? profileTitle.join(" ") : "",
                reviewDate,
                reviewLink,
            });
        });

        return { productData, hasNextPage };
    } catch (error) {
        return { error };
    }
}

/**
 * Generates paginated URL for G2 (used for scraping all pages)
 */
function generatePageUrl(baseUrl, pageNum) {
    if (pageNum === 1) return baseUrl;
    return baseUrl.includes('?') ? `${baseUrl}&page=${pageNum}` : `${baseUrl}?page=${pageNum}`;
}

/**
 * Parses various date formats into JavaScript Date objects
 */
function parseDate(dateStr) {
    dateStr = dateStr.trim();
    let m = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
    return new Date(dateStr);
}

/**
 * Filters reviews by date range
 */
function filterReviewsByDate(reviews, startDateStr, endDateStr) {
    const start = parseDate(startDateStr);
    const end = parseDate(endDateStr);
    return reviews.filter(review => {
        const rd = parseDate(review.reviewDate);
        return !isNaN(rd) && rd >= start && rd <= end;
    });
}

/**
 * Scrapes all paginated G2 pages and collects review data
 */
async function scrapeAllPages_G2(baseUrl) {
    let currentPage = 1;
    let hasNextPage = true;
    let allReviews = [];
    let productInfo = {};

    console.log(`Starting to scrape ${baseUrl} (G2)`);

    while (hasNextPage) {
        const currentUrl = generatePageUrl(baseUrl, currentPage);
        console.log(`Scraping page ${currentPage}: ${currentUrl}`);

        try {
            let parsedResult, response;
            for (let attempt = 1; attempt <= 5; attempt++) {
                response = await api.get(currentUrl);
                parsedResult = parsedDataFromHTML_G2(response.body);
                if (parsedResult.error) break;
                if (parsedResult.productData.allReviews.length > 0) break;
                console.warn(`Attempt ${attempt} for page ${currentPage} returned 0 reviews—retrying...`);
                await new Promise(r => setTimeout(r, 5000)); // Retry delay
            }

            if (parsedResult.error) break;

            // Save product info from first page
            if (currentPage === 1) {
                productInfo = {
                    productName: parsedResult.productData.productName,
                    stars: parsedResult.productData.stars,
                    totalReviews: parsedResult.productData.totalReviews,
                };
            }

            allReviews = [...allReviews, ...parsedResult.productData.allReviews];
            hasNextPage = parsedResult.hasNextPage;
            currentPage++;
            await new Promise(resolve => setTimeout(resolve, 25000)); // Avoid rate limits

        } catch (error) {
            console.error(`Failed to scrape page ${currentPage}:`, error);
            break;
        }
    }

    return {
        ...productInfo,
        allReviews,
        totalScrapedReviews: allReviews.length
    };
}

/**
 * Parses product and review info from Capterra HTML
 */
function parsedDataFromHTML_Capterra(html) {
    try {
        const $ = cheerio.load(html);
        const productData = {
            productName: "",
            stars: "",
            totalReviews: "",
            allReviews: [],
        };

        // Extract product details
        productData.productName = $("div#productHeader h1.mb-1").text();
        productData.stars = $("span.star-rating-component span.ms-1").text();

        // Parse each review
        $("#reviews > div.review-card, div.i18n-translation_container.review-card").each((_, element) => {
            const reviewerName = $(element).find("div.fw-bold, div.h5.fw-bold").text().trim();
            const profileTitle = $(element).find("div.text-ash").first().text().trim();
            const starsText = $(element).find("span.ms-1").text().trim();
            const reviewDate = $(element).find("span.ms-2").text().trim();
            const commentSection = $(element).find("p span:contains('Comments:')").parent();
            const reviewText = commentSection.find("span:not(:contains('Comments:'))").text().trim();
            const pros = $(element).find("p:contains('Pros:')").next().text().trim();
            const cons = $(element).find("p:contains('Cons:')").next().text().trim();

            productData.allReviews.push({
                reviewerName,
                profileTitle,
                stars: starsText,
                reviewDate,
                reviewText,
                pros,
                cons,
            });
        });

        productData.totalReviews = productData.allReviews.length.toString();
        return { productData };
    } catch (error) {
        return { error };
    }
}

/**
 * Converts relative review dates (e.g., "3 months ago") into absolute dates
 */
function calculateDateFromRelative(relativeTimeStr) {
    const currentDate = new Date();
    const lowerStr = relativeTimeStr.toLowerCase();
    if (lowerStr.includes('year')) {
        return new Date(currentDate.setFullYear(currentDate.getFullYear() - parseInt(relativeTimeStr)));
    } else if (lowerStr.includes('month')) {
        const months = parseInt(relativeTimeStr);
        return new Date(currentDate.setMonth(currentDate.getMonth() - months));
    } else if (lowerStr.includes('day')) {
        return new Date(currentDate.setDate(currentDate.getDate() - parseInt(relativeTimeStr)));
    }
    return new Date(relativeTimeStr);
}

/**
 * Check if a review falls in a specific date range
 */
function isReviewInDateRange(reviewDateStr, startDate, endDate) {
    const reviewDate = calculateDateFromRelative(reviewDateStr);
    return reviewDate >= new Date(startDate) && reviewDate <= new Date(endDate);
}

/**
 * Scrapes Capterra product reviews and filters them by date range
 */
async function scrapeAndFilterReviews_Capterra(baseUrl, startDate, endDate) {
    let allReviews = [];
    let filteredReviews = [];
    let productInfo = {};

    try {
        let parsedResult, response;
        for (let attempt = 1; attempt <= 5; attempt++) {
            response = await api.get(baseUrl);
            parsedResult = parsedDataFromHTML_Capterra(response.body);
            if (parsedResult.error) return null;
            if (parsedResult.productData.allReviews.length > 0) break;
            await new Promise(r => setTimeout(r, 5000));
        }

        let cleanProductName = parsedResult.productData.productName.replace(/ Reviews$/i, '');
        productInfo = {
            productName: cleanProductName,
            stars: parsedResult.productData.stars,
            totalReviews: parsedResult.productData.totalReviews
        };

        allReviews = parsedResult.productData.allReviews;
        filteredReviews = allReviews.filter(review => isReviewInDateRange(review.reviewDate, startDate, endDate));
    } catch {
        return null;
    }

    return {
        ...productInfo,
        allReviews: filteredReviews,
        totalScrapedReviews: filteredReviews.length
    };
}

/**
 * Main function: loads input, decides scraping logic, writes output
 */
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
            console.error("Input JSON must include 'url', 'start_date', and 'end_date'");
            process.exit(1);
        }

        let result;
        if (url.toLowerCase().includes('capterra')) {
            result = await scrapeAndFilterReviews_Capterra(url, start_date, end_date);
        } else if (url.toLowerCase().includes('g2')) {
            result = await scrapeAllPages_G2(url);
            result.allReviews = filterReviewsByDate(result.allReviews, start_date, end_date);
            result.totalScrapedReviews = result.allReviews.length;
        } else {
            console.error("Unsupported URL. Please provide a G2 or Capterra link.");
            process.exit(1);
        }

        if (!result) {
            console.error("Failed to scrape data");
            process.exit(1);
        }

        const fileInfo = saveToJsonFile(result);
        console.log("Scraping complete.");
        console.log("Product Name:", result.productName);
        console.log("Total Reviews (website):", result.totalReviews);
        console.log("Filtered Reviews:", result.totalScrapedReviews);
        console.log("Output saved to:", fileInfo.filePath);
    } catch (error) {
        console.error("Error during scraping:", error);
    }
}

main(); // Run the main function
