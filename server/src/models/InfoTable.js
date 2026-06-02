import mongoose from "mongoose";

const infoTableSchema = new mongoose.Schema({
    journal_id: { type: mongoose.Schema.Types.ObjectId, ref: "Journal", required: true },
    abbrevation: { type: String, required: true },
    issn: { type: String, required: true },
    editor_in_chief: { type: String, required: true },
    publishing_frequency: { type: String, required: true },
    impact_factor: { type: String, required: true },
    publication_type: { type: String, required: true },
    publishing_model: { type: String, required: true },
    journal_category: { type: String, required: true },
    email: { type: String, required: true },
    alternate_email: { type: String }

});
export const InfoTable = mongoose.model("InfoTable", infoTableSchema);