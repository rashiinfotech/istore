const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('express-flash');
const userRouter = require('./server/router/user');
const nocache = require("nocache");
const adminRouter = require('./server/router/admin');
const bodyParser = require('body-parser');
 const multer = require('multer');


const app = express();
const PORT = process.env.PORT || 8000;
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/uploads',express.static('uploads'))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());
app.use(nocache());
require('dotenv').config();


//session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const error = "mongodb error"

// MongoDB connection 
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((error) => {
  console.log("Error connecting to MongoDB:", error);
});

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname + ".png");
    }
  });

  const upload= multer({storage: storage})
 
  
//   app.post('/your-upload-route', upload.array('files'), (req, res) => {
//     console.log(req.files);
//   });

// Routing for user and admin
app.use('/', userRouter);
app.use('/admin', adminRouter);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/`);
});
