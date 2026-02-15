import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asynchHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req,_,next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        // console.log(token);
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        console.log("Decoded token:", decodedToken);
        console.log("Looking for user with _id:", decodedToken?._id);
        
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        console.log("Found user:", user);
    
        if (!user) {
            
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})