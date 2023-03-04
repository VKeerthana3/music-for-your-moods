if(process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}

const express = require("express");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const session = require("express-session");
const ejs = require("ejs");
const path = require("path");
const axios = require("axios");
const queryString = require("querystring");
const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/spotify';

const secret = process.env.SECRET


const User = require("./models/user");
const Playlist = require("./models/playList");
const Track = require("./models/track");


mongoose.connect(dbUrl, {
    useNewUrlParser: true
}).then(() => {
    console.log("Mongo connection open");
}).catch(err => {
    console.log("OH NO Mongo connection error");
    console.log(err);
})

const app = express();

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    secret
    })

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e);
})

app.use(session({
    store,
    secret,
    resave: false,
    saveUninitialized: false
}))

app.use(express.static(path.join(__dirname, '/public')));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.redirect("/login");
})

app.get("/login", (req, res) => {
    res.render("login.ejs");
})

// Connects the application to your spotify account
app.get("/account", async (req, res) => {
    console.log('in account route')
    try{
        const spotifyResponse = await axios.post(
            "https://accounts.spotify.com/api/token",
            queryString.stringify({
                grant_type: "authorization_code",
                code: req.query.code,
                redirect_uri: "https://immense-refuge-76074.herokuapp.com/account"
            }),
            {
                headers: {
                    Authorization: "Basic " + (Buffer(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64')),
                    "Content-Type": "application/x-www-form-urlencoded",
                }
            }
        );
        console.log('finished post');
        req.session.accessToken = spotifyResponse.data.access_token;
        console.log(spotifyResponse.data);

        res.render("home.ejs");
    } catch (e) {
        console.log(JSON.stringify(e), null, 2);
    }
})


app.get("/home", async (req, res) => {
    res.render("home.ejs");
})

// Get user details 
app.get("/user", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;
        let result = await axios.get("https://api.spotify.com/v1/me",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
      
        let currentUser = await User.findOne({id: result.data.id}).populate('playlists');

        if (currentUser === null){            
                currentUser = new User({
                    name: result.data.display_name,
                    id: result.data.id,
                    uri: result.data.uri,
                    playlists: [],
                    searchHistory: []                
            })
            
        await currentUser.save();
        console.log("Adding your user to the database");
        
        } 
                
        res.render("user.ejs", {currentUser});

    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

// Followed tracks route
app.get("/tracks", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;
        let result = await axios.get("https://api.spotify.com/v1/me/tracks",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        const tracks = result.data.items;
        res.render("tracks.ejs", {tracks: tracks});
    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }

})

// Fetches albums of a particular artist
app.get("/artists/:id", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;

        let {id} = req.params;
       
        let result = await axios.get(`https://api.spotify.com/v1/artists/${id}/albums`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        const albums = result.data.items;
        res.render("albums.ejs", {albums});
    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

// Fetches tracks of a particular album
app.get("/albums/:id", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;
       
        let result = await axios.get(`https://api.spotify.com/v1/albums/${req.params.id}/tracks`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        
        const tracks = result.data.items;
        res.render("albums_tracks.ejs", {tracks});
    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

// Fetches user's playlists
app.get("/playlists", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;
       
        let result = await axios.get(`https://api.spotify.com/v1/me/playlists`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        const playlists = result.data.items;
        res.render("playlists.ejs", {playlists, path: req.path})
    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

// Fetches playlists, and modifies the rendered ejs file by adding an 'Add to playlist' button 
app.get("/playlists/:id", async (req, res) => {
    try {
        const accessToken = req.session.accessToken;
        let result = await axios.get(`https://api.spotify.com/v1/me/playlists`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const playlists = result.data.items;
        res.render("playlists.ejs", {path: req.path, trackUri: req.params.id, playlists});
} catch (err) {
    res.send(err);
        console.log("error");
        console.log(err);
}
})

// Post route to add tracks to a playlists
app.post("/playlists/:playListid/:trackUri", async (req, res) => {
    try{

        const accessToken = req.session.accessToken;

        let my_result = await fetch(`https://api.spotify.com/v1/playlists/${req.params.playListid}/tracks?uris=${req.params.trackUri}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            }

        })
        let result = await my_result.json();

        let result2 = await axios.get(`https://api.spotify.com/v1/playlists/${req.params.playListid}/tracks`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const playlistTracks = result2.data.items;
            
        res.render('pTracks.ejs', {playlistTracks});
        
    } catch (err){
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

// Shows tracks of a paricular playlist
app.get('/showTracks/:id', async (req, res) => {
    try{
        const accessToken = req.session.accessToken;
    let result2 = await axios.get(`https://api.spotify.com/v1/playlists/${req.params.id}/tracks`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            let pTracks = result2.data.items;
            //console.log("The tracks i added: "+JSON.stringify(pTracks[0], null, 2));
            //console.log("checking :"+JSON.stringify(pTracks[0].track, null, 2))
            //console.log("-----")
            res.render('pTracks2.ejs', {pTracks});
    } catch(err){
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

// Renders form to ender mood value
app.get('/getMood', (req, res) => {
    res.render('mood.ejs');
})

// Compares entered mood value to top and followed artists' tracks' audio features: danceability, energy, and 
// valence to generate apropriate playlist and saves to database  
app.get("/mood", async (req, res) => {
    try{
        let moodValue = parseFloat(req.query.mood);

        let finalTracks = [];
        let finalArtists = [];
        let recommendedTracks = [];

        const accessToken = req.session.accessToken;

       
        let topArtists = await axios.get("https://api.spotify.com/v1/me/top/artists",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        let followedArtists = await axios.get('https://api.spotify.com/v1/me/following?type=artist',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        let totalArtists = topArtists.data.items.concat(followedArtists.data.artists.items);

        for(let artist of totalArtists){
            if (finalArtists.indexOf(artist) === -1){
                finalArtists.push(artist)
            }
        }

        for (let artist of finalArtists){
           
            let topTracks = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks?country=US`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })
            finalTracks = finalTracks.concat(topTracks.data.tracks);
        }

        for (let track of finalTracks){            
            
            let audioFeatures = await axios.get(`https://api.spotify.com/v1/audio-features/${track.id}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application-json",
                }
            });

            if (moodValue < 0.10) {
                console.log("Mood value in first confiton less than 0.1");
                if (0 <= audioFeatures.data.valence && audioFeatures.data.valence <= (moodValue + 0.15)
                && audioFeatures.data["danceability"] <= (moodValue + 8)
                && audioFeatures.data["energy"] <= (moodValue * 10)){
                    recommendedTracks.push(track)
                }
            }

            else if (0.10 <= moodValue < 0.25) {
                if ((moodValue - 0.075) <= audioFeatures.data["valence"] && audioFeatures.data["valence"] <= (moodValue + 0.075)
                && audioFeatures.data["danceability"] <= (moodValue * 4)
                && audioFeatures.data["energy"] <= (moodValue * 5)){
                    recommendedTracks.push(track)
                }
            }
            
            else if (0.25 <= moodValue < 0.50) {
                if ((moodValue - 0.05) <= audioFeatures.data["valence"] && audioFeatures.data["valence"] <= (moodValue + 0.05)
                && audioFeatures.data["danceability"] <= (moodValue * 1.75)
                && audioFeatures.data["energy"] <= (moodValue * 1.75)){
                    recommendedTracks.push(track)
                }
            }
            else if (moodValue >= 0.5 && moodValue < 0.75) {
                if ((moodValue - 0.075) <= audioFeatures.data["valence"] && audioFeatures.data["valence"] <= (moodValue + 0.075)
                && audioFeatures.data["danceability"] >= (moodValue / 2.5)
                && audioFeatures.data["energy"] >= (moodValue / 2)){
                    recommendedTracks.push(track)
                }
            }
            else if (0.75 <= moodValue < 0.90) {
                if ((moodValue - 0.075) <= audioFeatures.data["valence"] && audioFeatures.data["valence"] <= (moodValue + 0.075)
                && audioFeatures.data["danceability"] >= (moodValue / 2)
                && audioFeatures.data["energy"] >= (moodValue / 1.75)){
                    recommendedTracks.push(track)
                }
            }
            else if (moodValue >= 0.90) {
                if ((moodValue - 0.15) <= audioFeatures.data["valence"] && audioFeatures.data["valence"] <= 1
                && audioFeatures.data["danceability"] >= (moodValue / 1.75)
                && audioFeatures.data["energy"] >= (moodValue / 1.5)){
                    recommendedTracks.push(track)
                }
            }    
        }
       
        let recommendedTracksUris = [];
        let trackObject = new Track({});
        let trackObjects = [];

        for (let recommendedTrack of recommendedTracks){
            recommendedTracksUris.push(recommendedTrack.uri);
            trackObject.id = recommendedTrack.id;
            trackObject.name = recommendedTrack.name;
            
            for(let artist of recommendedTrack.artists){
                trackObject.artist = artist.name;
                if (recommendedTrack.artists.length > 1){
                    trackObject.artist += `, `;
                } 
            }
            trackObjects.push(trackObject);
        }

        trackObject.save();
        

        let myProfile = await axios.get("https://api.spotify.com/v1/me",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        let currentUser = await User.findOne({id: myProfile.data.id});

        let newPLaylist = await fetch(`https://api.spotify.com/v1/users/${myProfile.data.id}/playlists`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({name: `Playlist ${currentUser.playlists.length + 1}`})
        })

        let finalNewPlaylist = await newPLaylist.json();


        let my_result = await fetch(`https://api.spotify.com/v1/playlists/${finalNewPlaylist.id}/tracks?uris=${recommendedTracksUris}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            }
        })
        let result = await my_result.json();
        
        let playListObject = new Playlist({});
        playListObject.id = finalNewPlaylist.id;
        playListObject.mood = moodValue;
        playListObject.tracks = trackObjects;

        playListObject.save();

        currentUser.playlists.push(playListObject);

        currentUser.save();
      
        res.render("mood_playlists.ejs", {recommendedTracks});
                
    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

// Fetches albums of searched artists and saves search history to database 
app.get("/search", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;

        const {q} = req.query;
       
        let result = await axios.get(`https://api.spotify.com/v1/search?q=${q}&type=artist`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        let artistId = result.data.artists.items[0].id;
        let artistName = result.data.artists.items[0].name

        let myProfile = await axios.get("https://api.spotify.com/v1/me",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        let myself = await User.findOne({id: myProfile.data.id})

        if (myself === null){
            let currentUser = new User({
                name: myProfile.data.display_name
            })
           
            await currentUser.save();
        } 

        let date = new Date()
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        const formattedDate = date.toLocaleDateString('en-US', options);


        let newSearchHistory = {date, artistId, artistName };

          let currentUser = await User.findOneAndUpdate({id: myProfile.data.id}, {$push: 
            {searchHistory : newSearchHistory}},
            {new: true}); 


        let artistAlbums = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const albums = artistAlbums.data.items;
        res.render("search.ejs", {albums});

    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

const port = process.env.PORT || 8080;
app.listen(port, (req, res) => {
    console.log("Server is listening...");
})
