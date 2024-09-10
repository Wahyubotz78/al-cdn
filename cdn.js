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
const storage = multer.memoryStorage();  // Use memory storage to keep the file in memory
const upload = multer({ storage });

// Endpoint untuk upload file
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const db = await connectToMongo();
    const bucket = new GridFSBucket(db); // Inisialisasi GridFSBucket setelah koneksi ke database

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadStream = bucket.openUploadStream(req.file.originalname);
    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', () => {
      res.json({ fileId: uploadStream.id, fileName: req.file.originalname });
    });

    uploadStream.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint untuk menampilkan file
app.get('/files/:fileId', async (req, res) => {
  try {
    const db = await connectToMongo();
    const bucket = new GridFSBucket(db);

    const fileId = new ObjectId(req.params.fileId);

    bucket.openDownloadStream(fileId)
      .pipe(res)
      .on('error', (err) => {
        res.status(500).json({ error: err.message });
      });
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
