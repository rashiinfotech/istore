const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const User = require('../server/model/userModel'); // Adjust the path if necessary

module.exports = function(passport) {
    // Local strategy for username and password authentication
    passport.use(new LocalStrategy(
        async function(username, password, done) {
            try {
                const user = await User.findOne({ username: username });
                if (!user) {
                    return done(null, false, { message: 'Incorrect username.' });
                }
                if (!await bcrypt.compare(password, user.password)) {
                    return done(null, false, { message: 'Incorrect password.' });
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    ));

    // Google OAuth strategy for Google account authentication
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "https://rashi.i.store.solutions/auth/google/callback"
    },
    async function(token, tokenSecret, profile, done) {
        try {
            let user = await User.findOne({ googleId: profile.id });
            if (!user) {
                // Generate a random password for Google-authenticated users
                const randomPassword = Math.random().toString(36).slice(-8);
                const hashedPassword = await bcrypt.hash(randomPassword, 10);
                user = new User({
                    googleId: profile.id,
                    username: profile.displayName,
                    email: profile.emails[0].value,
                    password: hashedPassword,
                    phone: 0000000000 // Placeholder for phone, update as needed
                });
                await user.save();
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));

    // Serialize user for session management
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async function(id, done) {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });
};
