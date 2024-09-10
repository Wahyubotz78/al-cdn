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
let bucket;
MongoClient.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    const db = client.db(dbName);
    bucket = new GridFSBucket(db, { bucketName: 'files' });
    console.log('Connected to MongoDB');
  })
  .catch(err => console.error(err));

// Configure Multer memory storage (no file saved on disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });
app.get("/", (req, res) => {
  res.status(200).json({ status: 200, creator: "alan", msg: "Cdn active" });
// res.sendFile(fs.realpathSync("./public/index.html"))
});

app.get("/upload", (req, res) => {
  res.status(200).json({ status: 200, creator: "alan", msg: "Endpoint active, use POST method" });
});

// Route for uploading files
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { originalname, mimetype, buffer } = req.file;

    // Store file in MongoDB GridFS
    const uploadStream = bucket.openUploadStream(originalname, { contentType: mimetype });
    uploadStream.end(buffer);

    uploadStream.on('finish', () => {
      res.json({ 
        Url: global.baseurl + "files/" + uploadStream.id.toString(), 
        fileName: originalname,
        fileId: uploadStream.id.toString() 
      });
    });

    uploadStream.on('error', err => {
      res.status(500).json({ error: err.message });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to retrieve files by ID
app.get('/files/:id', async (req, res) => {
  try {
    const fileId = req.params.id;

    // Fetch file from MongoDB GridFS
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

    downloadStream.on('data', chunk => res.write(chunk));
    downloadStream.on('end', () => res.end());
    downloadStream.on('error', err => {
      res.status(404).json({ error: 'File not found' });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to download files by ID
app.get('/download/:id', async (req, res) => {
  try {
    const fileId = req.params.id;

    // Fetch file from MongoDB GridFS
    const downloadStream = bucket.openDownloadStream(new MongoClient.ObjectId(fileId));

    downloadStream.on('data', chunk => res.write(chunk));
    downloadStream.on('end', () => res.end());
    downloadStream.on('error', err => {
      res.status(404).json({ error: 'File not found' });
    });

    downloadStream.pipe(res);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route for home page
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
