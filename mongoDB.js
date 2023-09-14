const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define a schema for Slack data
const channelSchema = new mongoose.Schema({
    channelId: String,
    channelName: String,
});

const Channel = mongoose.model('Channel', channelSchema);

// Define a schema for ClickUp data
const listSchema = new mongoose.Schema({
    listId: String,
    listName: String,
});

const ClickUpList = mongoose.model('ClickUpList', listSchema);



module.exports = { Channel, ClickUpList };

