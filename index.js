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
const { v4 : uuid } = require("uuid");
const dbUrl = process.env.DB_URL;

const secret = process.env.SECRET

//process.env.;DB_URL

const User = require("./models/user");
const Playlist = require("./models/playList");
const Track = require("./models/track");



//const { response } = require("express");
//"mongodb://127.0.0.1:27017/spotify"

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

app.get("/login", (req, res) => {
    res.render("login.ejs");
})

app.get("/account", async (req, res) => {
    try{
        const spotifyResponse = await axios.post(
            "https://accounts.spotify.com/api/token",
            queryString.stringify({
                grant_type: "authorization_code",
                code: req.query.code,
                redirect_uri: 'https://immense-refuge-76074.herokuapp.com/account'
            }),
            {
                headers: {
                    Authorization: "Basic " + (Buffer(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64')),
                    "Content-Type": "application/x-www-form-urlencoded",
                }
            }
        );
        req.session.accessToken = spotifyResponse.data.access_token;
        console.log(spotifyResponse.data);

        res.render("home.ejs");
    } catch (e) {
        console.log(e);
    }
})

app.get("/home", async (req, res) => {
    res.render("home.ejs");
})

app.get("/user", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;
        let result = await axios.get("https://api.spotify.com/v1/me",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        console.log("this is the result "+JSON.stringify(result.data, null, 2));
        //console.log(result.data.display_name)
        //console.log(result.data.id)
        //console.log(result.data.uri)
       

        let currentUser = await User.findOne({id: result.data.id}).populate('playlists');
        console.log("Myself is "+ currentUser);

        /** 
        for (let pList of currentUser.playlists){
            for (let track of pList.tracks){
                console.log("The track one by one: "+track);
                console.log(`https://api.spotify.com/v1/tracks/${track}`);
                let myTrack = await axios.get(`https://api.spotify.com/v1/tracks/${track}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        console.log("My Tracks are: "+myTrack);
            }
        }
        */      
            
        

        if (currentUser === null){            
                currentUser = new User({
                    name: result.data.display_name,
                    id: result.data.id,
                    uri: result.data.uri,
                    playlists: [],
                    searchHistory: []                
            })
            console.log('going to add');
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

app.get("/tracks", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;
        let result = await axios.get("https://api.spotify.com/v1/me/tracks",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        //console.log("this is the result "+JSON.stringify(result.data, null, 2));
        const tracks = result.data.items;
       // console.log(tracks);

        res.render("tracks.ejs", {tracks: tracks});
    } catch (err) {
        res.status(400).send(err);
        console.log("error");
        console.log(err);
    }

})

app.get("/artists", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;
       
        let result = await axios.get("https://api.spotify.com/v1/artists",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        //console.log("this is the result "+JSON.stringify(result.data));
    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }

})

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
        
        //console.log("this is the result "+JSON.stringify(result.data, null, 2));
        const albums = result.data.items;

        res.render("albums.ejs", {albums});
    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

app.get("/albums/:id", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;
       
        let result = await axios.get(`https://api.spotify.com/v1/albums/${req.params.id}/tracks`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        console.log("this is the result albums tracks "+JSON.stringify(result.data.items[0], null, 2));
        const tracks = result.data.items;
        //console.log("These are the tracks");
        //console.log(tracks);

        res.render("albums_tracks.ejs", {tracks});
    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

app.get("/playlists", async (req, res) => {
    try{
        const accessToken = req.session.accessToken;
       
        let result = await axios.get(`https://api.spotify.com/v1/me/playlists`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        
        console.log("this is the result "+JSON.stringify(result.data.items[0], null, 2));

        const playlists = result.data.items;
        res.render("playlists.ejs", {playlists, path: req.path})
    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }
})

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

app.post("/playlists/:playListid/:trackUri", async (req, res) => {
    try{

        const accessToken = req.session.accessToken;
        console.log("in the post request");

        let my_result = await fetch(`https://api.spotify.com/v1/playlists/${req.params.playListid}/tracks?uris=${req.params.trackUri}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            }

        })
        let result = await my_result.json();
        //console.log("The result is " + result);

        console.log("added")

        let result2 = await axios.get(`https://api.spotify.com/v1/playlists/${req.params.playListid}/tracks`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            console.log("showing")
            const playlistTracks = result2.data.items;
            console.log("tracks"+JSON.stringify(playlistTracks[0], null, 2));
/**
        const config = {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            }
        };
       
        await axios.post(`https://api.spotify.com/v1/playlists/${req.params.playListid}/tracks?uris=${req.params.trackUri}`, config);
            
       */
        
        //console.log("this is the post playlists "+JSON.stringify(result.data, null, 2));

        //res.send("Added track to playlist");

        //res.redirect(`/playlists/${req.params.playListid}`);
        res.render('pTracks.ejs', {playlistTracks});
        
        
    } catch (err){
        res.send(err);
        console.log("error");
        console.log(err);
    }

})

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
            console.log("The tracks i added: "+JSON.stringify(pTracks[0], null, 2));
            console.log("checking :"+JSON.stringify(pTracks[0].track, null, 2))
            console.log("-----")
            res.render('pTracks2.ejs', {pTracks});
    } catch(err){
        res.send(err);
        console.log("error");
        console.log(err);
    }
    
})



app.get('/getMood', (req, res) => {
    res.render('mood.ejs');
})

app.get("/trial", async (req, res) => {
    try{
        let moodValue = parseFloat(req.query.mood);
        //console.log("Mood value is of type: "+typeof moodValue);

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

        //console.log("this is the top artists "+JSON.stringify(topArtists.data, null, 2));
        
        let followedArtists = await axios.get('https://api.spotify.com/v1/me/following?type=artist',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        })

        //console.log("this is the followed artists "+JSON.stringify(followedArtists.data, null, 2));

        let totalArtists = topArtists.data.items.concat(followedArtists.data.artists.items);

        for(let artist of totalArtists){
            if (finalArtists.indexOf(artist) === -1){
                finalArtists.push(artist)
            }
        }

        //console.log("Total artists: ", finalArtists);

        for (let artist of finalArtists){
            //console.log("Artist id: ", artist.id)
            let topTracks = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks?country=US`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })
           // console.log("Top tracks");
            //console.log(topTracks.data.tracks);
            finalTracks = finalTracks.concat(topTracks.data.tracks);
            //console.log("==========");
            //console.log(finalTracks);

        }

        for (let track of finalTracks){            
            
            let audioFeatures = await axios.get(`https://api.spotify.com/v1/audio-features/${track.id}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application-json",
                }
            });

            //console.log("Audio feature of track is " + JSON.stringify(audioFeatures.data, null, 2))

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
        console.log('Recommended tracks');
        console.log(recommendedTracks);

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

        console.log("New playlist: " + JSON.stringify(finalNewPlaylist, null, 2));

        let my_result = await fetch(`https://api.spotify.com/v1/playlists/${finalNewPlaylist.id}/tracks?uris=${recommendedTracksUris}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            }

        })
        let result = await my_result.json();
        console.log("The result is " + JSON.stringify(result, null, 2));
        
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

        console.log("Current user is "+ JSON.stringify(myProfile.data, null, 2));

        let myself = await User.findOne({id: myProfile.data.id})
        console.log("Myself is "+ myself);

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

      //  let currentUser = await User.findOneAndUpdate({id: myProfile.data.id}, {$set: 
        //    {"searchHistory.artistId" : artistId}},
          //  {new: true});

          let currentUser = await User.findOneAndUpdate({id: myProfile.data.id}, {$push: 
            {searchHistory : newSearchHistory}},
            {new: true}); 

        console.log("Actual current user: "+currentUser);

        //currentUser.searchHistory.artistId = artistId;
        //currentUser.playlists = [];
        //currentUser.save();


        let artistAlbums = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/albums`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        console.log(artistAlbums.data.items);
        const albums = artistAlbums.data.items;
        res.render("search.ejs", {albums});

    } catch (err) {
        res.send(err);
        console.log("error");
        console.log(err);
    }
})


app.listen(process.env.PORT, (req, res) => {
    console.log("Server is listening...");
})
