import mongoose, {Schema} from "mongoose";

const emailSchema = new Schema(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        message_id: {
            type: String,
            required: true,
            unique: true
        },
        thread_id: {
            type: String,
        },
        date: {
            type: Date,
        },
        from: {
            type: String,
        },
        job_related: {
            type: Boolean,
            default: false
        },
        job_confidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 0
        },
        status: {
            type: String,
            enum: ["applied", "interview", "assessment", "offer", "rejected", "closed", "unknown"],
            default: "unknown"
        },
        original_status: {
            type: String,
            enum: ["applied", "interview", "assessment", "offer", "rejected", "closed", "unknown"],
            default: null
        },
        status_reason: {
            type: String,
            default: null
        },
        status_confidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 0
        },
        company_name: {
            type: String,
            default: null
        },
        role: {
            type: String,
            default: null
        },
        role_id: {
            type: String,
            default: null
        },
        application_id: {
            type: String,
            default: null
        },
        group_id: {
            type: Schema.Types.ObjectId,
            ref: "Group",
            default: null
        },
        interview_datetime: {
            type: Date,
            default: null
        },
        mode: {
            type: String,
            default: null
        },
        platform: {
            type: String,
            default: null
        },
        location: {
            type: String,
            default: null
        },
        meeting_link: {
            type: String,
            default: null
        },
        deadline_datetime: {
            type: Date,
            default: null
        },
        duration: {
            type: String,
            default: null
        },
        test_link: {
            type: String,
            default: null
        },
        compensation: {
            type: String,
            default: null
        },
        joining_date: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

emailSchema.index({user_id: 1, status: 1});
emailSchema.index({user_id: 1, job_related: 1});
emailSchema.index({user_id: 1, company_name: 1});
emailSchema.index({user_id: 1, deadline_datetime: 1});
emailSchema.index({user_id: 1, interview_datetime: 1});

export const Email = mongoose.model("Email", emailSchema);
