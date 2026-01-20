import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDb = async() => {
    try {
        // Check if MONGODB_URL exists
        if (!process.env.MONGODB_URL) {
            throw new Error("❌ MONGODB_URL is not defined in .env file");
        }

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("✅ Database connected successfully");
        
    } catch (error) {
        console.error("❌ Database connection error:", error.message);
        // console.log(process.env.MONGODB_URL);
        
        
        // Exit process if database connection fails
        // This prevents the server from running without database
        process.exit(1);
    }
}

export default connectDb;
