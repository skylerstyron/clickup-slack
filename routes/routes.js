const express = require('express');
const router = express.Router();
const { getChannels, postMessageToSlack, formatCommentForSlackMentions } = require('../slackAPI');
const { getClickUpFolders, getClickUpLists, getClickUpTaskInfo, postTaskComment } = require('../clickUpAPI');
const { findListNameByListId } = require('../models/clickuplists');
const { findChannelNameByListName } = require('../models/slackchannels');
const { Channel, ClickUpList, TaskThreads } = require('../mongoDB');



// Fetch Slack channels and store in MongoDB
router.get('/fetch-channels', async (req, res) => {
    try {
        console.log('Fetching Slack channels...');
        const channels = await getChannels();

        // Filter active channels and match with the regex
        const filteredChannels = channels.filter((channel) => {
            return !channel.is_archived && channel.name.match(/-([A-Za-z]{3})-(\d{4})/g);
        });

        for (const channel of filteredChannels) {
            // Check if a document with the same channelId exists
            const existingChannel = await Channel.findOne({ channelId: channel.id });

            if (existingChannel) {
                // If the document exists, do nothing or update as needed
                // For example, you can update the name if it has changed
                if (existingChannel.channelName !== channel.name) {
                    await Channel.findOneAndUpdate(
                        { channelId: channel.id },
                        { channelName: channel.name }
                    );
                    console.log('Updated channel name: ' + channel.name);
                }
            } else {
                // If the document doesn't exist, create a new one
                const newChannel = new Channel({
                    channelId: channel.id,
                    channelName: channel.name,
                });
                await newChannel.save();
                console.log('Added channel: ' + channel.name);
            }
        }

        res.json({ message: 'Active channels matching regex stored/updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

router.post('/slack-event', async (req, res) => {
    try {
        const { challenge, type } = req.body;

        if (type === 'url_verification') {

            res.status(200).send(challenge);
        } else {
            const body = req.body;
            const ts = body.event.ts;
            const event_ts = body.event.event_ts;
            const commentText = body.event.text;
            const thread_ts = body.event.thread_ts;

            // console.log(body);

            if (!body.event.bot_profile) {
                console.log("User Comment:" + commentText);
                const taskThread = await TaskThreads.findOne({ parentTs: thread_ts });

                if (taskThread) {
                    const taskId = taskThread.taskId;
                    await postTaskComment(taskId, commentText);
                    console.log('Posted message to: ' + taskId);
                }

                // Post Message to Clickup Task
            } else {
                console.log("BOT COMMENT");

            }
            res.status(200).send('Received');
        }

    } catch (error) {
        console.error('Error while processing Slack event: ', error);
        res.status(500).send('Internal Server Error');
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
                // Check if a document with the same listId exists
                const existingList = await ClickUpList.findOne({ listId: list.id });

                if (!existingList) {
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

        if (comment.includes("[API_COMMENT]")) {
            console.log("This comment originated from the API. Skipping processing.");
            res.sendStatus(200);
            return;
        }

        const taskInfo = await getClickUpTaskInfo(taskId);

        if (!taskInfo) {
            const error = 'Task info is null or undefined.';
            console.error(error);
            res.status(500).json({ error }); // Send a Bad Request response
        }

        const { name: taskName, url: taskURL } = taskInfo;

        const listName = await findListNameByListId(listId);
        // console.log('listName: ' + listName);

        const channelId = await findChannelNameByListName(listName);

        if (!channelId) {
            const error = 'Channel not found for listName: ' + listName;
            console.error(error);
            res.status(500).json({ error }); // Send a Bad Request response
        }
        
        // console.log('channelId: ' + channelId);

        const formattedComment = formatCommentForSlackMentions(comment);


        // Send a message to Slack channel
        await postMessageToSlack(channelId, taskURL, taskId, taskName, formattedComment, user);

        res.sendStatus(200); // Send a 200 OK response
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

router.get('/stored-lists', async (req, res) => {
    try {
        const lists = await ClickUpList.find({});
        res.status(200).json(lists);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
})

router.post('/update-list', async (req, res) => {
    try {
        const response = req.body;
        const listId = response.list_id;
        const updatedName = response.history_items[0].after;

        const list = await ClickUpList.findOneAndUpdate(
            { listId: listId },
            { $set: { listName: updatedName } },
            { new: true }
        );

        if (!list) {
            console.log('No list with Id: ' + listId);
            return res.status(404).json({ message: 'Couldn\'t find a list with matching ID.' });
        }

        console.log('Updated List: ' + list.listName);
        res.status(200).json({ message: 'List updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
});


module.exports = router;

