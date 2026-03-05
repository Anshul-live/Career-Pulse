
import express from "express"
import cors from "cors";
import passport from "../src/config/passport.js";
import session from "express-session";; // strategy file
import authRoutes from "./routes/auth.routes.js";

import cookieParser from "cookie-parser"


const app = express()

app.use(express.json({limit: "50mb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(authRoutes);



// routes  import
import userRouter from './routes/user.routes.js'

// routes declaration..
app.use("/users",userRouter);


import gmailRoutes from "./routes/gmail.routes.js";
app.use("/gmail", gmailRoutes);

import applicationRoutes from "./routes/application.routes.js";
app.use("/applications", applicationRoutes);


app.use((err, req, res, next) => {
    console.log(" ERROR CAUGHT:", err.message);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});



export {app }