const express = require('express');
const multer = require('multer');
const methodOverride = require('method-override');
const path = require('path');
const { MongoClient, GridFSBucket, ObjectId} = require('mongodb');
const fs = require("fs")
const app = express();
const PORT = 3000;
const cors = require("cors")
app.use(cors());
app.use(express.json());
app.set('json spaces', 2);
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'cdn')));
global.baseurl;

// Middleware for base URL
app.use((req, res, next) => {
  const host = req.get('host');
  global.baseurl = `https://${host}/`;
  next();
});

// MongoDB connection setup
const mongoUri = 'mongodb+srv://alanqwerty:qwerty123@cluster0.cjvb1q8.mongodb.net/mydatabase?retryWrites=true&w=majority';
const dbName = 'filedb';
const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToMongo() {
  await client.connect();
  console.log('Connected to MongoDB');
  return client.db(dbName);
}

// Setup multer
const upload = multer(); // In-memory storage for chunked upload
const uploadStreams = new Map(); // To store upload streams for each file

app.post('/upload', upload.single('chunk'), async (req, res) => {
    try {
        const { fileName, chunkIndex, totalChunks } = req.body;
        const db = await connectToMongo();
        const bucket = new GridFSBucket(db);

        // Parse chunk index and total chunks
        const currentChunkIndex = parseInt(chunkIndex, 10);
        const total = parseInt(totalChunks, 10);

        // Check if this is the first chunk
        if (currentChunkIndex === 0) {
            const uploadStream = bucket.openUploadStream(fileName);
            uploadStreams.set(fileName, uploadStream); // Save the stream for future chunks
        }

        // Get the upload stream for the file
        const uploadStream = uploadStreams.get(fileName);
        if (!uploadStream) {
            return res.status(500).json({ error: 'Upload stream not found' });
        }

        // Write the chunk data to the upload stream
        uploadStream.write(req.file.buffer);

        // If it's the last chunk, end the stream and return success
        if (currentChunkIndex === total - 1) {
            uploadStream.end(); // Close the stream
            uploadStream.on('finish', () => {
                const fileId = uploadStream.id;
                uploadStreams.delete(fileName); // Clean up the stream reference
                res.json({ message: 'File upload complete', fileId, filename: fileName });
            });
        } else {
            res.json({ message: `Chunk ${chunkIndex} uploaded successfully` });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/files/:fileId', async (req, res) => {
    try {
        const db = await connectToMongo();
        const bucket = new GridFSBucket(db);
        const filename = req.query.filename
        const fileId = new ObjectId(req.params.fileId);

        // Ambil informasi file dari MongoDB
        const file = await bucket.find({ _id: fileId }).toArray();
        if (!file || file.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const fileLength = file[0].length; // Ukuran total file
        const range = req.headers.range;

        if (!range) {
            // Jika tidak ada Range, kirimkan seluruh file
            res.set('Content-Type', file[0].contentType);
            res.set('Content-Length', fileLength);
            res.set('Accept-Ranges', 'bytes');
              res.set('Content-Disposition', `attachment; filename="${filename}"`);
            bucket.openDownloadStream(fileId).pipe(res);
        } else {
            // Jika ada Range header, lakukan streaming sebagian file
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileLength - 1;

            if (start >= fileLength || end >= fileLength) {
                res.status(416).json({ error: 'Requested range not satisfiable' });
                return;
            }

            const chunkSize = (end - start) + 1;
            res.status(206);
            res.set({
                'Content-Range': `bytes ${start}-${end}/${fileLength}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': file[0].contentType,
            });

            // Stream sebagian file yang diminta
            bucket.openDownloadStream(fileId, { start, end: end + 1 }).pipe(res);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get("/", (req, res) => {
  res.status(200).json({ status: 200, creator: "alan", msg: "Cdn active" });
// res.sendFile(fs.realpathSync("./public/index.html"))
});

app.get("/upload", (req, res) => {
  res.status(200).json({ status: 200, creator: "alan", msg: "Endpoint active, use POST method" });
});




// 404 middleware
app.use((req, res) => {
  res.status(404).send(generateErrorPage(404, 'Page Not Found'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

function generateErrorPage(status, message) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error ${status}</title>
  <style>
    body {
      background-image: url('https://telegra.ph/file/6877f86f35d68bd8c10a4.jpg');
      color: white;
      text-align: center;
      font-family: Arial, sans-serif;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      margin: 0;
    }
    h1 {
      font-size: 5em;
      animation: blink 1s step-end infinite;
    }
    p {
      font-size: 2em;
    }
    a {
      font-size: 1.5em;
      color: lightblue;
      text-decoration: none;
      margin-top: 20px;
    }
    @keyframes blink {
      from, to {
        visibility: hidden;
      }
      50% {
        visibility: visible;
      }
    }
  </style>
</head>
<body>
  <h1>Error ${status}</h1>
  <p>${message}</p>
  <a href="/">Back to Home</a>
</body>
</html>
  `;
}
