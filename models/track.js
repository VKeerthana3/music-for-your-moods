const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema({
    id: String,
    name: String,
    artist: String
})

const Track = mongoose.model("Track", trackSchema);

module.exports = Track;