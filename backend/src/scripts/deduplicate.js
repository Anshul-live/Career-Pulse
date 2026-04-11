import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../db/db.js";
import { Email } from "../models/email.model.js";
import { User } from "../models/user.model.js";

async function deduplicate() {
    await connectDB();
    console.log("Connected to MongoDB");

    const users = await User.distinct("_id");
    console.log(`Found ${users.length} users`);

    let totalDeleted = 0;

    for (const userId of users) {
        const duplicates = await Email.aggregate([
            { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: "$message_id", count: { $sum: 1 }, ids: { $push: "$_id" } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        if (duplicates.length === 0) {
            console.log(`User ${userId}: No duplicates`);
            continue;
        }

        console.log(`User ${userId}: Found ${duplicates.length} duplicate groups`);

        for (const dup of duplicates) {
            const idsToDelete = dup.ids.slice(1);
            const result = await Email.deleteMany({ _id: { $in: idsToDelete } });
            totalDeleted += result.deletedCount;
            console.log(`  Deleted ${result.deletedCount} duplicates for message_id: ${dup._id}`);
        }
    }

    console.log(`\nTotal duplicates removed: ${totalDeleted}`);
    
    const stats = await Email.aggregate([
        { $group: { _id: { user: "$user_id", msg: "$message_id" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: "remainingDuplicates" }
    ]);

    if (stats.length === 0) {
        console.log("✓ No duplicates remaining");
    } else {
        console.log(`✗ Still have ${stats[0].remainingDuplicates} duplicates remaining`);
    }

    await mongoose.disconnect();
    console.log("Done");
}

deduplicate().catch(console.error);
