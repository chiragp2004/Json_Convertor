const express = require("express");
const path = require("path");
const cors = require("cors");
const multer = require("multer"); // 1. Use multer for file uploads
const xlsx = require("xlsx"); // 2. Use xlsx for conversion

const app = express();
app.use(cors());
app.use(express.json());

// Set up Multer for file storage (in memory storage is easiest for quick processing)
const upload = multer({ storage: multer.memoryStorage() });

// -------- JSON to Excel Conversion Route --------
// Use 'upload.single("jsonFile")' to handle a single file named 'jsonFile' from the form
app.post("/api/convert-download", upload.single("jsonFile"), (req, res) => {
    // Check if a file was uploaded
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded. Please select a JSON file." });
    }

    const jsonFileBuffer = req.file.buffer;
    const originalFileName = req.file.originalname;

    console.log(`\n[SERVER] Received file: ${originalFileName}`);

    let jsonData;
    try {
        // Parse the JSON buffer into a JavaScript object
        const jsonString = jsonFileBuffer.toString('utf8');
        jsonData = JSON.parse(jsonString);

        // --- Log the received data on the server ---
        console.log(`[SERVER] Successfully parsed JSON data.`);
        // Note: For large files, avoid logging the whole object:
        // console.log("[SERVER] Data preview:", jsonData.slice(0, 3)); // if it's an array
        // ---------------------------------------------
        
    } catch (parseError) {
        console.error("[SERVER] Error parsing uploaded file as JSON:", parseError.message);
        return res.status(400).json({ error: "The uploaded file is not a valid JSON file." });
    }

    // --- Convert JSON to Excel (Worksheet) ---
    // Assuming the JSON data is an array of objects for simple conversion
    const worksheet = xlsx.utils.json_to_sheet(jsonData);

    // Create a new workbook and append the sheet
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "DataSheet");

    // Write the workbook to a buffer
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // --- Send the Excel file to the browser for download ---
    const excelFileName = originalFileName.replace(path.extname(originalFileName), "") + "_converted.xlsx";
    
    // 3. Log the download process
    console.log(`[SERVER] Converted and sending file for download: ${excelFileName}`);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${excelFileName}"`);
    
    // Send the buffer to the client
    res.send(excelBuffer);
});

// -------- Test endpoint (remains the same) --------
app.get("/", (req, res) => {
  res.send("Server is running! Use /api/convert-download to upload a JSON and download an Excel file.");
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});