const mongoose = require("mongoose");
const Playlist = require("./playList");
const Track = require("./track");


const userSchema = new mongoose.Schema({
    name: String,
    id: String,
    uri: String,
    playlists: [{type: mongoose.Schema.Types.ObjectId, ref: Playlist, default: []}],
    searchHistory: [{
        dateToday: {
            type: Date,
            required: true,
            default: Date.now
        },
        artistId: String,
        artistName: String
    }    ]
})

const User = mongoose.model("User", userSchema);
module.exports = User;