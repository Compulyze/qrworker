addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // If the request includes a 'url' query parameter, generate QR code
  if (url.searchParams.has('url')) {
    const userUrl = url.searchParams.get('url');
    try {
      // Validate URL
      new URL(userUrl);
      
      // Generate QR code using qrcode library
      const qrCodeScript = `
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <script>
          new QRCode(document.createElement('div'), {
            text: "${userUrl}",
            width: 256,
            height: 256
          })._el.querySelector('canvas').toDataURL('image/png', (err, url) => {
            if (!err) {
              // Send the QR code image data back to the client
              fetch('/', {
                method: 'POST',
                body: url
              });
            }
          });
        </script>
      `;
      
      // Execute QR code generation in a headless context
      const response = await new Response(qrCodeScript).text();
      
      // Wait for the POST request with the image data
      if (request.method === 'POST') {
        const imageData = await request.text();
        return new Response(imageData.split(',')[1], {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-cache'
          },
          status: 200
        });
      }
      
      // Return a temporary response to trigger the QR code generation
      return new Response('', { status: 200 });
    } catch (e) {
      return new Response('Invalid URL', { status: 400 });
    }
  }

  // Serve the HTML form for GET requests
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>QR Code Generator</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          input { padding: 10px; width: 300px; }
          button { padding: 10px 20px; margin-left: 10px; }
          img { margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Generate QR Code</h1>
        <form onsubmit="generateQR(event)">
          <input type="url" id="urlInput" placeholder="Enter a URL" required>
          <button type="submit">Create QR</button>
        </form>
        <div id="qrCode"></div>
        <script>
          async function generateQR(event) {
            event.preventDefault();
            const url = document.getElementById('urlInput').value;
            const response = await fetch('?url=' + encodeURIComponent(url));
            if (response.ok) {
              const imageData = await response.blob();
              const img = document.createElement('img');
              img.src = URL.createObjectURL(imageData);
              const qrCodeDiv = document.getElementById('qrCode');
              qrCodeDiv.innerHTML = '';
              qrCodeDiv.appendChild(img);
            } else {
              alert('Error generating QR code');
            }
          }
        </script>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    },
    status: 200
  });
}