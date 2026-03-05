import mongoose, { Schema } from "mongoose";

const timelineEventSchema = new Schema(
    {
        status: {
            type: String,
            enum: ["applied", "interview", "assessment", "offer", "rejected", "closed", "unknown"],
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        email_id: {
            type: Schema.Types.ObjectId,
            ref: "Email",
            default: null
        },
        summary: {
            type: String,
            default: null
        }
    },
    { _id: true, timestamps: false }
);

const applicationSchema = new Schema(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
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
        thread_ids: [{
            type: String
        }],
        current_status: {
            type: String,
            enum: ["applied", "interview", "assessment", "offer", "rejected", "closed", "unknown"],
            default: "unknown"
        },
        timeline: [timelineEventSchema],
        email_ids: [{
            type: Schema.Types.ObjectId,
            ref: "Email"
        }],
        next_action: {
            type: String,
            default: null
        },
        next_action_date: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

applicationSchema.index({ user_id: 1, role_id: 1 });
applicationSchema.index({ user_id: 1, application_id: 1 });
applicationSchema.index({ user_id: 1, current_status: 1 });
applicationSchema.index({ user_id: 1, "thread_ids": 1 });

export const Application = mongoose.model("Application", applicationSchema);
