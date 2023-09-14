const express = require('express');
const router = express.Router();
const { getChannels, postMessageToSlack, formatCommentForSlackMentions } = require('../slackAPI');
const { getClickUpFolders, getClickUpLists, getClickUpTaskInfo } = require('../clickUpAPI');
const { findListNameByListId } = require('../models/clickuplists');
const { findChannelNameByListName } = require('../models/slackchannels');
const { Channel, ClickUpList } = require('../mongoDB');



// Fetch Slack channels and store in MongoDB
router.get('/fetch-channels', async (req, res) => {
    try {
        console.log('Fetching Slack channels...');
        const channels = await getChannels();

        // Filter active channels and match with the regex
        const filteredChannels = channels.filter((channel) => {
            return !channel.is_archived && channel.name.match(/-([A-Za-z]{3})-(\d{4})/g);
        });

        const channelInfo = filteredChannels.map(channel => ({
            id: channel.id,
            name: channel.name,
        }));

        // Store matching channels in MongoDB
        for (const channel of filteredChannels) {
            const newChannel = new Channel({
                channelId: channel.id,
                channelName: channel.name,
            });
            await newChannel.save();
        }

        res.json({ message: 'Active channels matching regex stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});


// Fetch ClickUp folders and lists and store in MongoDB
router.get('/fetch-clickup-data', async (req, res) => {
    try {
        console.log('Fetching ClickUp Lists...');
        const folders = await getClickUpFolders();

        for (const folder of folders) {
            const lists = await getClickUpLists(folder.id);

            const listInfo = lists.map(list => ({
                id: list.id,
                name: list.name,
            }));

            for (const list of listInfo) {
                // Find the corresponding document in the database by listId
                const existingList = await ClickUpList.findOne({ listId: list.id });

                if (existingList) {
                    // If the document exists, check if the listName has been modified
                    if (existingList.listName !== list.name) {
                        // Update the listName in the database
                        await ClickUpList.findOneAndUpdate(
                            { listId: list.id },
                            { listName: list.name }
                        );
                        console.log('Updated list name: ' + list.name);
                    }
                } else {
                    // If the document doesn't exist, create a new one
                    const clickUpList = new ClickUpList({
                        listId: list.id,
                        listName: list.name,
                    });
                    await clickUpList.save();
                    console.log('Added list: ' + list.name);
                }
            }
        }

        res.json({ message: 'ClickUp data fetched and stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});


// Define the ClickUp webhook route
router.post('/clickup-webhook', async (req, res) => {
    try {
        const webhookData = req.body.history_items[0];
        const eventId = webhookData.id;
        const comment = webhookData.comment.text_content;
        const listId = webhookData.parent_id;
        const taskId = webhookData.comment.parent;
        const user = webhookData.user.username;


        const taskInfo = await getClickUpTaskInfo(taskId);

        if (!taskInfo) {
            console.error('Task info is null or undefined.');
            res.sendStatus(400); // Send a Bad Request response
            return;
        }

        const { name: taskName, url: taskURL } = taskInfo;

        const listName = await findListNameByListId(listId);
        // console.log('listName: ' + listName);
        
        const channelId = await findChannelNameByListName(listName);
        
        if (!channelId) {
            console.error('Channel not found for listName:', listName);
            res.sendStatus(400); // Send a Bad Request response
            return;
        }
        // console.log('channelId: ' + channelId);

        const formattedComment = formatCommentForSlackMentions(comment);

        // Send a message to Slack channel
        postMessageToSlack(channelId, taskURL, taskName, formattedComment, user);

        res.sendStatus(200); // Send a 200 OK response
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

module.exports = router;

