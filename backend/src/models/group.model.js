import mongoose, {Schema} from "mongoose";

const timelineEntrySchema = new Schema({
    status: {
        type: String,
        enum: ["applied", "interview", "assessment", "offer", "rejected", "closed"],
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    from_email_id: {
        type: Schema.Types.ObjectId,
        ref: "Email"
    },
    triggered_by: {
        type: String,
        enum: ["system", "user"],
        default: "system"
    },
    notes: {
        type: String,
        default: null
    }
}, {_id: true});

const groupSchema = new Schema({
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
    application_id: {
        type: String,
        default: null
    },
    thread_id: {
        type: String,
        default: null
    },
    state: {
        type: String,
        enum: ["applied", "interview", "assessment", "offer", "rejected", "closed", "unknown"],
        default: "unknown"
    },
    timeline: [timelineEntrySchema],
    email_ids: [{
        type: Schema.Types.ObjectId,
        ref: "Email"
    }],
    is_merged: {
        type: Boolean,
        default: false
    },
    merged_from: [{
        type: Schema.Types.ObjectId,
        ref: "Group"
    }],
    notes: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

groupSchema.index({user_id: 1, state: 1});
groupSchema.index({user_id: 1, company_name: 1});
groupSchema.index({user_id: 1, application_id: 1});
groupSchema.index({user_id: 1, thread_id: 1});

export const Group = mongoose.model("Group", groupSchema);
