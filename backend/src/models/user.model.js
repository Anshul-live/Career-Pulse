import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema(
    {
        
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
        },
        fullName: {
            type: String,         
            trim: true, 
            index: true
        },
        
        
        password: {
            type: String,
            enum: ["local", "google"],
            default: "local"
            //required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        },
        lastFetchDate: {
            type: Date,
            default: null
        }

    },
    {
        timestamps: true
    }
)

userSchema.pre("save", async function () {
    if(!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10)
    
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)