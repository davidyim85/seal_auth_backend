////////////////////////////
// IMPORT OUR DEPENDENCIES
////////////////////////////
// read our .env file and create environmental variables
require("dotenv").config();
// pull PORT from .env, give default value
// const PORT = process.env.PORT || 8000
// const DATABASE_URL = process.env.DATABASE_URL
const { PORT = 8000, DATABASE_URL } = process.env;
// import express
const express = require("express");
// create application object
const app = express();
// import mongoose
const mongoose = require("mongoose");
// import cors
const cors = require("cors");
// import morgan
const morgan = require("morgan");
//import bcryptjs
const bcrypt = require("bcryptjs");
//import jwt
const jwt = require("jsonwebtoken");

///////////////////////////
// DATABASE CONNECTION
///////////////////////////
// Establish Connection
mongoose.connect(DATABASE_URL);

// Connection Events
mongoose.connection
  .on("open", () => console.log("You are connected to mongoose"))
  .on("close", () => console.log("You are disconnected from mongoose"))
  .on("error", (error) => console.log(error));

////////////////////////////
// Models
////////////////////////////
// models = PascalCase, singular "People"
// collections, tables =snake_case, plural "peoples"

//user schema. 
//Users to signup and login
const userSchema = new mongoose.Schema({
  username: { type: String, require: true, unique: true },
  password: { type: String, require: true }
});

const User = mongoose.model("User", userSchema);

const peopleSchema = new mongoose.Schema({
  name: String,
  image: String,
  title: String,
  username: String, //we are going to affiliate people that are created by the users that create them
});

const People = mongoose.model("People", peopleSchema);

//////////////////////////////
// Middleware
//////////////////////////////


//NEW!!!
////////////////////////////////
// Custom Auth Middleware Function
////////////////////////////////

const authCheck = async (req, res, next) => {
  //look for a token on the request headers
  //it should be from Authorization
  //there should be Bearer <space> <token> hence the split
  //[1] is the token ([0] is the word 'Bearer');
  // put the token in variable form
  const token = req.header('Authorization')?.split(' ')[1];

  //if no token return a 401 with unauthorized message
  if (!token) {
    return res.status(401).json({ message: 'unauthorized' })
  }

  try {
    //decode the token to see if it is value
    const decoded = await jwt.verify(token, process.env.SECRET);
    console.log(decoded);
    //attach username to EVERY request
    req.username = decoded.userId;

    //proceed or move to the next middleware
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Forbidden' })
  }
}



// cors for preventing cors errors (allows all requests from other origins)
app.use(cors());
// morgan for logging requests
app.use(morgan("dev"));
// express functionality to recognize incoming request objects as JSON objects
app.use(express.json());

////////////////////////////
// ROUTES
////////////////////////////

//signing up 
app.post("/signup", async (req, res) => {
  try {
    //destructure the request. Every request has a body with a property called username and password (see the schema)
    let { username, password } = req.body;
    //hash password. EG if password is 123, this will ensure that 123 is NOT save in the db. its going to save a hashed version of 123 using our encryption package
    password = await bcrypt.hash(password, await bcrypt.genSalt(10));
    //create the user
    const user = await User.create({ username, password })

    res.json(user);
  } catch (err) {
    res.status(400).json({ err })
  }
});

// logging in
app.post("/login", async (req, res) => {
  //destructure the request. Every request has a body with a property called username and password (see the schema)
  let { username, password } = req.body;
  //find the user in the databases
  const user = await User.findOne({ username });

  //NEW!!!
  //look for invalid passwords and nonexistant users
  if (!user || !bcrypt.compareSync(password, user.password)) {
    // return an error message saying invalid credentials
    return res.status(401).json({ error: 'Invalid Credentials' });
  }

  //NEW!!!
  // generate a token
  const token = jwt.sign({ userId: user.id }, process.env.SECRET, { expiresIn: '1h' });

  // return it in the response
  res.json({ token })

})




// "/people"
// INDUCES - INDEX, xNEWx, DELETE, UPDATE, CREATE, xEDITx, SHOW
// IDUCS - INDEX, DESTROY, UPDATE, CREATE, SHOW (FOR AN JSON API)

// INDEX - GET - /people - gets all people
app.get("/people", authCheck, async (req, res) => {
  try {
    console.log(req.username)
    // fetch all people from database
    //Added username inside the mongoose method FIND
    const people = await People.find({ username: req.username });
    // send json of all people
    res.json(people);
  } catch (error) {
    // send error as JSON
    res.status(400).json({ error });
  }
});

// CREATE - POST - /people - create a new person
app.post("/people", authCheck, async (req, res) => {
  try {
    // create the new person

    //add username to req.body every time we make create
    //since in our middle ware we put in username on EVERY request, we have access to req.username
    //assign req.body.username to be req.username
    req.body.username = req.username

    const person = await People.create(req.body);
    // send newly created person as JSON
    res.json(person);
  } catch (error) {
    res.status(400).json({ error });
  }
});

// SHOW - GET - /people/:id - get a single person
app.get("/people/:id", authCheck, async (req, res) => {
  try {
    // get a person from the database
    const person = await People.findById(req.params.id);
    // return the person as json
    res.json(person);
  } catch (error) {
    res.status(400).json({ error });
  }
});

// UPDATE - PUT - /people/:id - update a single person
app.put("/people/:id", authCheck, async (req, res) => {
  try {
    // update the person
    const person = await People.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    // send the updated person as json
    res.json(person);
  } catch (error) {
    res.status(400).json({ error });
  }
});

// DESTROY - DELETE - /people/:id - delete a single person
app.delete("/people/:id", authCheck, async (req, res) => {
  try {
    // delete the person
    const person = await People.findByIdAndDelete(req.params.id)
    // send deleted person as json
    res.status(204).json(person)
  } catch (error) {
    res.status(400).json({ error })
  }
})

// create a test route
app.get("/", (req, res) => {
  res.json({ hello: "world" });
});

////////////////////////////
// LISTENER
////////////////////////////
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
