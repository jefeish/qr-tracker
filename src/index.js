const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const { stringify } = require('csv-stringify');
const path = require('path');
const { qrCodeGenerator } = require('./qrCodeGenerator');
const { generateSecretName } = require('./generateSecretName');
const { sendEmail } = require('./sendEmail');
const fs = require('fs');
const e = require('express');
require('dotenv').config();
const app = express();
const PORT = 4000;

// Setup body-parser
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Setup SQLite database
const db = new sqlite3.Database(':memory:');

// Create a table for praticipant entries
db.serialize(() => {
    db.run(`CREATE TABLE entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL
    )`);
});

// Initialize an empty array to store the qrList secrets
let qrList = [];

// Entry point
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// create a new raffle
app.get('/new', (req, res) => {
        // Generate a secret name and check that it's unique, meaning it's not 
        // already in the raffleMap. If it is, generate a new one.
        // try this a maximum of 100 times, after which we'll return a message
        // that we reached the maximum number of raffles.
        // NOTE: the secret name is not stored in the database.
        // It only lives at runtime

        let secret = generateSecretName();
        let count = 0;
        while (count < 100) {
            secret = generateSecretName();
            count++;
        }
        qrList.push(secret);

        // log the qrList
        console.log('qrList:', qrList);
        
        // const imagePath = path.join(__dirname, 'public/images/github-logo.png');
        qrCodeGenerator(`${process.env.QR_CODE_URL}`, null)
            .then(svgWithOverlay => {
                // Return HTML with the raffle ID and the SVG
                res.send(`<!DOCTYPE html>
                    <html>
                        <head>
                            <title>Registry</title>
                            <link rel="stylesheet" href="styles.css">
                        </head>
                        <body>
                            <div class="container">
                                <p class="title">QR Code to Share</p><br><br>
                                <div style="width: 80%; display: flex; justify-content: center; align-items: center;">
                                    <svg id="raffle-svg" width="150%" height="150%" xmlns="http://www.w3.org/2000/svg">
                                        ${svgWithOverlay}
                                    </svg>
                                </div>
                                <canvas id="qrCanvas" style="display:none;"></canvas>
                                <br><br><br><br>
                                <button id="download-btn">Download QR Code</button>
                                <br><br>
                                <p class="title2">Your Access Key is:</p>
                                <p class="secret">${secret}</p>
                                <p class="title2">Keep the Access Key safe, you'll need it to access the QR-Code participants data.</p>
                            </div>
                            <script>
                                function downloadSVGAsPNG(svgElementId, filename) {
                                    const svgElement = document.getElementById(svgElementId);
                                    const svgData = new XMLSerializer().serializeToString(svgElement);
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');

                                    const img = new Image();
                                    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                                    const url = URL.createObjectURL(svgBlob);

                                    img.onload = function() {
                                        canvas.width = svgElement.width.baseVal.value;
                                        canvas.height = svgElement.height.baseVal.value;
                                        ctx.drawImage(img, 0, 0);
                                        URL.revokeObjectURL(url);
                                        
                                        // Convert canvas to PNG and trigger download
                                        const pngData = canvas.toDataURL('image/png');
                                        const a = document.createElement('a');
                                        a.href = pngData;
                                        a.download = filename;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                    };
                                    
                                    img.src = url;
                                }

                                document.getElementById('download-btn').addEventListener('click', function() {
                                    downloadSVGAsPNG('raffle-svg', 'qr-code.png');
                                });
                            </script>
                        </body>
                    </html>`);
            })
            .catch(err => {
                console.error(err);
                res.status(500).send('Error generating QR Code');
            });
});

// Render the form
app.get('/register', (req, res) => {
    console.log('dirname:', __dirname);
    res.sendFile(path.join(__dirname, 'public', 'form.html'));
});


// Handle form submission
app.post('/submit', (req, res) => {
    const { email } = req.body;
        // insert the entry into the database (including the raffle number)
        db.run(`INSERT INTO entries (email) VALUES (?)`, [email], function (err) {
            if (err) {
                return res.status(500).send('Error saving entry');
            }

            console.log(`Entry: ${email} saved`);
                
            // send an email to the participant
            const from = 'noreply@github.com';
            const to = email;
            const subject = 'Copilot Training Registration';
            const text = `Thank you! We have received your registration for the Copilot Training`;
            const html = `<h1>Thank you!</h1><br> We have received your registration for the Copilot Training<br><br>Here is the link to the training: <a href="${process.env.LINK}">${process.env.LINK}</a>`;
            sendEmail(to, subject, text, html)
            res.sendFile(path.join(__dirname, 'public', 'done.html'));
        });


});


// Download entries as CSV with a limit parameter
app.get('/download/:secret', (req, res) => {
    const { secret } = req.params;
    // if the secret does not exist in the qrList, return a 404
    if (!qrList.includes(secret)) {
        res.send(`<!DOCTYPE html>
            <html>
                <head>
                    <title>Download</title>
                    <link rel="stylesheet" href="styles.css">
                </head>
                <body>
                    <div class="container">
                        <p class="title">I am sorry, no data could be found.</p>
                    </div>
                </body>
            </html>`);
        return res.status(404)
    }

    db.all(`SELECT * FROM entries`, (err, rows) => {
        if (err) {
            return res.status(500).send('Error retrieving entries');
        }
        console.log('All entries:', rows); // Log the result to the console

        if (rows.length > 0) {
            // Extract the keys from the first object to create the header
            const headers = Object.keys(rows[0]).join(',');

            // Convert rows to string
            const rowsString = rows.map(row => Object.values(row).join(',')).join('\n');

            // Combine headers and rows
            const csvString = `${headers}\n${rowsString}`;

            // Now csvString contains the CSV data with headers
            console.log(csvString);
            fs.writeFileSync('registration-list.csv', csvString);
        }

        // uncomment the following lines to create a CSV file for browser download
        stringify(rows, {
            header: true
        }, (err, output) => {
            if (err) {
                return res.status(500).send('Error generating CSV');
            }

            res.header('Content-Type', 'text/csv');
            res.attachment(`registration-list.csv`);
            res.send(output);
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
