import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: function() {
            // Password is required only for local authentication
            return this.authProvider === 'local';
        },
        minlength: [6, "Password must be at least 6 characters"]
    },
    hasPassword: {
        type: Boolean,
        default: function() {
            // Default to true for local auth, false for Google auth
            return this.authProvider === 'local';
        }
    },
    role: {
        type: String,
        enum: ['admin', 'advocate', 'client', 'paralegal'],
        default: 'client',
        required: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null values
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
        required: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    profilePicture: {
        type: String,
        default: null
    },
    // Phase 2: Connection System Fields
    specialization: {
        type: [String],
        default: [],
        validate: {
            validator: function(arr) {
                return arr.length <= 10;
            },
            message: "Cannot have more than 10 specializations"
        }
    },
    experience: {
        type: Number,
        default: 0,
        min: [0, "Experience cannot be negative"],
        max: [50, "Experience cannot exceed 50 years"]
    },
    location: {
        city: {
            type: String,
            default: null,
            trim: true
        },
        state: {
            type: String,
            default: null,
            trim: true
        },
        country: {
            type: String,
            default: "India",
            trim: true
        }
    },
    bio: {
        type: String,
        default: null,
        trim: true,
        maxlength: [500, "Bio cannot exceed 500 characters"]
    },
    phone: {
        type: String,
        default: null,
        trim: true,
        match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please enter a valid phone number']
    },
    availability: {
        type: Boolean,
        default: true
    },
    rating: {
        type: Number,
        default: 0,
        min: [0, "Rating cannot be negative"],
        max: [5, "Rating cannot exceed 5"]
    },
    totalCases: {
        type: Number,
        default: 0,
        min: [0, "Total cases cannot be negative"]
    },
    profileComplete: {
        type: Boolean,
        default: false
    },
    languages: {
        type: [String],
        default: [],
        validate: {
            validator: function(arr) {
                return arr.length <= 10;
            },
            message: "Cannot have more than 10 languages"
        }
    }
}, { timestamps: true });

// Index for search optimization
userSchema.index({ role: 1, availability: 1 });
userSchema.index({ 'location.city': 1, 'location.state': 1 });
userSchema.index({ specialization: 1 });
userSchema.index({ rating: -1 });

// Virtual for profile completion percentage
userSchema.virtual('profileCompletionPercentage').get(function() {
    let completed = 0;
    const total = 10;
    
    if (this.name) completed++;
    if (this.email) completed++;
    if (this.phone) completed++;
    if (this.bio) completed++;
    if (this.location && this.location.city) completed++;
    if (this.specialization && this.specialization.length > 0) completed++;
    if (this.experience > 0) completed++;
    if (this.languages && this.languages.length > 0) completed++;
    if (this.profilePicture) completed++;
    if (this.isEmailVerified) completed++;
    
    return Math.round((completed / total) * 100);
});

// Method to check if profile is complete
userSchema.methods.checkProfileCompletion = function() {
    const requiredFields = ['name', 'email', 'phone', 'bio'];
    const isComplete = requiredFields.every(field => this[field]);
    
    if (this.role === 'advocate' || this.role === 'paralegal') {
        return isComplete && 
               this.specialization.length > 0 && 
               this.experience > 0 &&
               this.location.city;
    }
    
    return isComplete;
};

const User = mongoose.model("User", userSchema);
export default User;
