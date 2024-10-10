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

// create a new QR-Code
app.get('/new', (req, res) => {
        // generate a new secret name
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
                // Return HTML with the URL-Link and the SVG
                res.send(`<!DOCTYPE html>
                    <html>
                        <head>
                            <title>process.env.TITLE</title>
                            <link rel="stylesheet" href="styles.css">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body>
                            <div class="container">
                                <p class="title">QR Code <br>${process.env.QR_CODE_URL}</p>
                                <div style="width: 80%; display: flex; justify-content: center; align-items: center;">
                                    <svg id="qr-code-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                        ${svgWithOverlay}
                                    </svg>
                                </div>
                                <canvas id="qrCanvas" style="display:none;"></canvas>
                                <button id="download-btn">Download QR Code</button>
                                <p>Your Access Key is:</p>
                                <p class="secret">${secret}</p>
                                <p>Use it to download participants data.</p>
                                <p style="text-align:left;">Commands:<br>
                                <p class="command"><a href="${process.env.QR_CODE_URL}register">/register</a></p>
                                <p class="command"><a href="${process.env.QR_CODE_URL}download/${secret}">/download/${secret}</a></p>
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
                                    downloadSVGAsPNG('qr-code-svg', 'qr-code.png');
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
        // insert the entry into the database
        db.run(`INSERT INTO entries (email) VALUES (?)`, [email], function (err) {
            if (err) {
                return res.status(500).send('Error saving entry');
            }

            console.log(`Entry: ${email} saved`);
                
            // send an email to the participant
            const from = 'noreply@github.com';
            const to = email;
            const subject = 'Copilot Training Registration';
            const text = `Thank you! We have received your registration for the Copilot Training. Here’s the link to access the training: ${process.env.LINK}`;
            const html = `<h1>Thank you!</h1><br> We have received your registration for the Copilot Training<br><br>Here’s the link to access the training: <a href="${process.env.LINK}">${process.env.LINK}</a>`;
            sendEmail(from, to, subject, text, html)
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
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
