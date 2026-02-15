
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });

console.log("DEBUG: GOOGLE_CLIENT_ID =", process.env.GOOGLE_CLIENT_ID);

import mongoose from "mongoose";
import connectDB from "./db/db.js";
import cors from "cors";

import {app} from './app.js'

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running at port :${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO DB connection failed.. ",err)
});


