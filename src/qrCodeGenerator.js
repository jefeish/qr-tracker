const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

async function qrCodeGenerator(text, imagePath) {
    if (imagePath === undefined || imagePath === null) {
        imagePath = path.join(__dirname, 'public/images/github-logo.png');
    }

    console.log('imagePath', imagePath);
    
    // Generate QR code as SVG
    const qrSvg = await QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'H' });

    // Read the overlay image as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const overlayImage = `data:image/png;base64,${base64Image}`;

    // Embed the overlay image in the QR code SVG
    const svgWithOverlay = qrSvg.replace('</svg>', `
        <image x="13" y="13" width="15" height="15" href="${overlayImage}" />
        </svg>
    `);

    fs.writeFileSync('qr-code.svg', svgWithOverlay);
    return svgWithOverlay;
}

exports.qrCodeGenerator = qrCodeGenerator;
