const axios = require('axios');
require('dotenv').config();
const { TaskThreads } = require('./mongoDB');
const botToken = process.env.SLACK_BOT_TOKEN;

const getChannels = async () => {
    let allChannels = [];
    let cursor = '';

    do {
        try {
            const response = await axios.get('https://slack.com/api/conversations.list', {
                headers: {
                    Authorization: `Bearer ${botToken}`,
                },
                params: {
                    cursor: cursor || undefined,
                },
            });

            allChannels.push(...response.data.channels);
            cursor = response.data.response_metadata?.next_cursor || '';
        } catch (error) {
            console.error('Error fetching channels:', error);
            return [];
        }
    } while (cursor);

    return allChannels;
};


const formatCommentForSlackMentions = (comment) => {
    const mentionRegex = /@(\w+)/g;
    const formattedComment = comment.replace(mentionRegex, (username) => `<${username.toLowerCase()}>`);
    return formattedComment;
};


const postMessage = async (channelID, messageData) => {
    try {
        const response = await axios.post('https://slack.com/api/chat.postMessage', messageData, {
            headers: {
                Authorization: `Bearer ${botToken}`,
            },
        });

        if (response.data.ok) {
            console.log('Message posted successfully!');
            console.log('Channel: ' + channelID);
            return response.data.ts; // Return the timestamp of the posted message.
        } else {
            console.error('Failed to post message:', response.data.error);
            console.log('Channel: ' + channelID);
            return null; // Return null to indicate failure.
        }
    } catch (error) {
        console.error('Error posting message:', error.message);
        return null; // Return null to indicate an error.
    }
};

const createThreadMessageData = (channelID, taskURL, taskName) => {
    return {
        channel: channelID,
        "attachments": [
            {
                "color": "#f2c744",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `*<${taskURL}|${taskName}>*`
                        }
                    }
                ]
            }
        ]
    };
};

const postMessageToSlack = async (channelID, taskURL, taskId, taskName, messageText, user) => {
    const taskThreads = await TaskThreads.findOne({ taskId: taskId });

    if (!taskThreads) {
        let messageData = createThreadMessageData(channelID, taskURL, taskName);
        const thread_ts = await postMessage(channelID, messageData);

        // Only if the message was successfully posted, create a TaskThreads entry.
        const taskThread = new TaskThreads({
            taskId: taskId,
            parentTs: thread_ts,
        });
        await taskThread.save();
        console.log('Added TaskThread for task: ' + taskName);

        // Post the threaded reply.
        messageData = {
            channel: channelID,
            thread_ts: thread_ts,
            "attachments": [
                {
                    "color": "#f2c744",
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `${messageText}`
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `by ${user}`
                            }
                        }
                    ]
                }
            ],
        };

        await postMessage(channelID, messageData);

    } else {
        const thread_ts = taskThreads.parentTs;
        const replyMessageData = {
            channel: channelID,
            thread_ts: thread_ts,
            "attachments": [
                {
                    "color": "#f2c744",
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `${messageText} FROM TEST`
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `by ${user}`
                            }
                        }
                    ]
                }
            ],
        };

        await postMessage(channelID, replyMessageData);
    }
};


module.exports = { getChannels, formatCommentForSlackMentions, postMessageToSlack };