const mongoose = require("mongoose");
const Track = require("./track");

const playListSchema = new mongoose.Schema({
    id: String,
    mood: {
        type: Number,
        default: 0.5
    },
    tracks: [{type: mongoose.Schema.Types.ObjectId, ref: Track}]
})

const Playlist = mongoose.model("Playlist", playListSchema);

module.exports = Playlist;