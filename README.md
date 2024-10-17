# Music for your Moods

I have developed a web application called Music for your Moods using NodeJS, Express web framework, MongoDB database, and the Spotify Web API. EJS was chosen as the template engine and the styling was done purely using CSS. Finally, the application was deployed on Heroku.

This web application provides four main functionalities for the users:
1. Generates playlists based on the mood value entered by the user. They are generated from the top and followed artists’ tracks from their Spotify account. The value is compared to three audio features of a track, namely, danceability, valence, and energy to filter out the appropriate tracks to form the playlist. Finally, the mood value and the generated playlist are added to the database.
2. Search for albums of an artist and save the details of the user’s search history (artist searched for and date) on the database.
3. Provides general functionalities such as viewing a user’s playlists, followed tracks, followed artists, as well as their albums and their corresponding tracks.
4. Allows a user to add a track to an existing playlist on their Spotify account. They can choose the track and playlist it should be added to, and this is also reflected on their Spotify account.
