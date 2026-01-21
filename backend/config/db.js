import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// Cache the database connection for serverless
let cachedConnection = null;

const connectDb = async() => {
    try {
        // Check if MONGODB_URL exists
        if (!process.env.MONGODB_URL) {
            throw new Error("❌ MONGODB_URL is not defined in .env file");
        }

        // Return cached connection if available (for serverless optimization)
        if (cachedConnection && mongoose.connection.readyState === 1) {
            console.log("✅ Using cached database connection");
            return cachedConnection;
        }

        // Connect to MongoDB with serverless-optimized settings
        const connection = await mongoose.connect(process.env.MONGODB_URL, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        cachedConnection = connection;
        console.log("✅ Database connected successfully");
        
        return connection;
        
    } catch (error) {
        console.error("❌ Database connection error:", error.message);
        
        // For serverless, throw error instead of exiting process
        throw error;
    }
}

export default connectDb;
