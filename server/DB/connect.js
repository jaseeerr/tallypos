// const mongoose = require('mongoose');
// mongoose.set('strictQuery', true);
// mongoose.connect('mongodb://127.0.0.1:27017/digiLib',{useNewUrlParser:true})

// mongoose.connection.once('open',()=>console.log('database connection success')).on('error',error=>{
// console.log(error);
// })

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/tallypos');
    console.log("MongoDB connected successfully.");
  } catch (err) {
    console.error("Database connection failed:", err.message);
  }
};

connectDB();