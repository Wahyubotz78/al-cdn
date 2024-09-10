const express = require('express');
const multer = require('multer');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');
const app = express();
const PORT = 3000;
const fs = require("fs")
const mongoUri = 'mongodb+srv://alanqwerty:qwerty123@cluster0.cjvb1q8.mongodb.net/mydatabase?retryWrites=true&w=majority';
const dbName = 'tttt';
const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(express.static('cdn'));
async function connectToMongo() {
  await client.connect();
  console.log('Connected to MongoDB');
  return client.db(dbName);
}
const storage = multer.memoryStorage(); 
const upload = multer({ storage });
app.get("/", (req,res) => {
  res.status(200).json({status: 200, creator: "alan", msg: "Cdn active"})
})
app.post('/upload', upload.single('file'), async (req, res) => {
  const db = await connectToMongo();
  const bucket = new GridFSBucket(db);

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
});
app.get('/files/:fileId', async (req, res) => {
  const db = await connectToMongo();
  const bucket = new GridFSBucket(db);

  const fileId = new ObjectId(req.params.fileId);

  bucket.openDownloadStream(fileId)
    .pipe(res)
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
});

// Endpoint untuk mengunduh file
app.get('/download/:fileId', async (req, res) => {
  const db = await connectToMongo();
  const bucket = new GridFSBucket(db);

  const fileId = new ObjectId(req.params.fileId);

  bucket.openDownloadStream(fileId)
    .pipe(res)
    .on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// 404 Not Found middleware
app.use((req, res) => {
  res.status(404).json({ error: 'Page Not Found' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
