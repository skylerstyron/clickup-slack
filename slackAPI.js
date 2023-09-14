const axios = require('axios');
require('dotenv').config();
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
    return comment.replace(mentionRegex, '<@$1>').toLowerCase();
};

const postMessageToSlack = async (channelID, taskURL, taskName, messageText, user) => {
    try {
        const response = await axios.post('https://slack.com/api/chat.postMessage', {
            channel: channelID,
            "attachments": [
                {
                    "color": "#f2c744",
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `*<${taskURL}|${taskName}>*\n${messageText}`
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
                },

            ],
        },
            {
                headers: {
                    Authorization: `Bearer ${botToken}`,
                },
            }
        );

        if (response.data.ok) {
            console.log('Message posted successfully!');
            console.log('Channel: ' + channelID, 'Task: ' + taskName);
        } else {
            console.log('Failed to post message:', response.data.error);
            console.log('Channel: ' + channelID, 'Task: ' + taskName);
        }
    } catch (error) {
        console.error('Error posting message:', error.message);
    }
}

module.exports = { getChannels, formatCommentForSlackMentions, postMessageToSlack };