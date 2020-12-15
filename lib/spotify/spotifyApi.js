// spotifyApi.js
// ==========

const {spotify_playlist_name, spotify_playlist_description} = require("../../config.json");

const {storeSpotifyAuth, getLatestAuth} = require("../database/mongoDB");
let SpotifyWebApi = require('spotify-web-api-node');
let scopes = ['playlist-modify-public'];

const credentials = {
    redirectUri: process.env.SPOTIFY_REDIRECT_URL,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    clientId: process.env.SPOTIFY_CLIENT_ID
};

let spotifyApi = new SpotifyWebApi(credentials);

// Convert the authorization code for an access token
function getSpotifyAuthToken(user, code) {
    // Retrieve an access token and a refresh token
    return spotifyApi.authorizationCodeGrant(code).then(data => {
        // Set the access token on the API object to use it in later calls
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);

        // store the auth token in the database
        return storeSpotifyAuth(user, data.body['access_token'], data.body['refresh_token'], data.body['expires_in']);
    }).catch(err => {
        console.log('Something went wrong, could not get auth token!', err);
        throw err;
    });
}

// Call this function when the access token expires and a new ones is needed
function refreshToken(user, token) {

    spotifyApi.setRefreshToken(token.refresh_token);

    // clientId, clientSecret and refreshToken has been set on the api object previous to this call.
    return spotifyApi.refreshAccessToken().then(data => {
        console.log('The access token has been refreshed!');

        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);

        // store the auth token in the database
        return storeSpotifyAuth(user, data.body['access_token'], data.body['refresh_token'], data.body['expires_in']);
    }).error(err =>  {
        console.log('Could not refresh access token', err);
        throw err;
    });
}

// Call this function to check if a user is authenticated and refresh the auth token if necessary
function authenticateUser(user) {

    return getLatestAuth(user)
        .then(token => {
            if (token == null) throw new Error("Token not found, can not authenticate user.");
            return (token.expires_at <= Date.now()) ? refreshToken(user, token) : token; // Refresh token if expired
        })
        .then(token => {
            spotifyApi.setAccessToken(token.access_token);
            spotifyApi.setRefreshToken(token.refresh_token);
            return token;
        });
}

// This will get the url for the user to go to to authenticate the application
function getAuthURL(user) {
    return spotifyApi.createAuthorizeURL(scopes, user);
}

// Returns a promise with the playlist id on success
function createPlaylist(user) {
    return authenticateUser(user)
        .then(isAuthenticated => {
            return spotifyApi.createPlaylist(spotify_playlist_name + '-' + new Date().toLocaleDateString(),
                {'description': spotify_playlist_description, 'public': true });
        })
        .then(r => {
            console.log("playlist created successfully.");
            return r.body.id;
        });
}

// the playlist must already exist
function addTracksToPlaylist(user, playlistId, tracks) {

    return authenticateUser(user)
        .then(isAuthenticated => {
            return spotifyApi.addTracksToPlaylist(playlistId, tracks);
        })
        .then(r => {
            console.log("Tracks added successfully: ", + r);
            return playlistId;
        });
}

module.exports = {
    addTracksToPlaylist: addTracksToPlaylist,
    createPlaylist: createPlaylist,
    getSpotifyAuthToken: getSpotifyAuthToken,
    getAuthURL: getAuthURL
};