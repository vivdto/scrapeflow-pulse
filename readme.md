# **Scrapeflow | Pulse - Transforming feedback into action's Assignment**

![image](https://github.com/user-attachments/assets/bfb06e54-b58e-4c34-8bd3-0bd438aa4c9d)

A Node.js script designed to scrape SaaS product reviews from a specified review source (e.g., G2, Capterra, etc.). The script collects detailed information such as review text, review date, rating, and reviewer name, and outputs the data in a structured JSON format.

---

## **Features**
- Scrapes reviews from a SaaS product's review page.
- Outputs reviews in a structured JSON format, making it easy to process further.
- Configurable for different SaaS products by passing different URLs.

---

## **Installation**

1. Clone or download the repository:
   ```bash
   git clone https://github.com/vivdto/scrapeflow-pulse
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## **Usage**

### **Running the Scrapeflow**
To run the scraper, use the following command:
```bash
node scraper.js
```

This command will scrape reviews from the input.json file of the given URL.

---

## **Input**
- **URL**: The URL of the SaaS product review page you want to scrape. This URL should be structured such that it includes the reviews for a specific product. For example: 
  ```
  https://www.example.com/review/saas-product
  ```
  ![image](https://github.com/user-attachments/assets/3b9ca996-4f1c-4e13-ac57-64fd56ca928e)

---

## **Output**
The scraper saves the collected reviews as a structured JSON file in the `output/` directory. Each file is named using the SaaS product’s company name and the current timestamp, ensuring unique filenames for each scrape. The naming format is:

![image](https://github.com/user-attachments/assets/d23988b4-8101-43ec-beb1-176a001873fa)


```
<company_name>-YYYY-MM-DDTHH-MM-SS.json
```
![image](https://github.com/user-attachments/assets/f9fa1974-ebaa-4fed-a860-7dc13910c800)

For example, if the company name is "saas-product" and the scrape is done on "2025-04-29", the filename might look like:
```
saas-product-2025-04-29T12-30-45.json
```

### **Output Structure**
The JSON file will contain an array of review objects, where each object represents a single review with the following fields:

![image](https://github.com/user-attachments/assets/77b4efad-0f00-47a2-abea-1b058af32b2a)

```json
[
  {
    "Review Text": "This is the review text.",
    "Review Date": "2025-04-28",
    "Rating": 4
  },
  {
    "Review Text": "Another review text.",
    "Review Date": "2025-04-27",
    "Rating": 5
  }
]
```

Each review object contains:
- **Review Text**: The body of the review (a string) left by the reviewer.

  ![image](https://github.com/user-attachments/assets/f14a83c3-9fd4-41e4-91c3-44c85478bc5b)
  
- **Review Date**: The date when the review was posted (a string in `YYYY-MM-DD` format).
- **Rating**: The rating provided by the reviewer, typically on a scale of 1 to 5.

---

## **Example of Full Command and Output**

1. **Command**:
   ```bash
   node scraper.js
   ```
   ![image](https://github.com/user-attachments/assets/e3f84bb3-db43-4934-b88e-6e1b0720dc80)


2. **Output File**:
   After running the command, the scraper will generate a file in the `output/` folder like this:
   ```
   output/saas-product-2025-04-29T12-30-45.json
   ```
   ![image](https://github.com/user-attachments/assets/221dd3ed-0860-458a-ac43-42211fdfec7e)

3. **Content of the Output File**:
   ```json
   [
     {
       "Review Text": "This is the best SaaS product I've used in years!",
       "Review Date": "2025-04-28",
       "Rating": 5
     },
     {
       "Review Text": "Good, but could use some improvement.",
       "Review Date": "2025-04-27",
       "Rating": 4
     },
     {
       "Review Text": "Not worth the price, very buggy.",
       "Review Date": "2025-04-26",
       "Rating": 2
     }
   ]
   ```

---

## **Dependencies**
- **axios**: For making HTTP requests to fetch the HTML content of the review pages.
- **cheerio**: A jQuery-like library for parsing HTML and extracting the required data.
- **fs**: For file system operations, such as saving the scraped data to files.
- **path**: For handling and manipulating file paths in a cross-platform manner.

---

## **License**
This project is licensed under the MIT License.
