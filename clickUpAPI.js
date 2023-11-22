require('dotenv').config();
const axios = require('axios');

const token = process.env.CLICKUP_API_TOKEN;
const SPACE_ID = process.env.SPACE_ID;
const CLICKUP_URL = process.env.CLICKUP_URL;

const getClickUpFolders = async () => {
    const response = await axios.get(`${CLICKUP_URL}space/${SPACE_ID}/folder`, {
        headers: {
            Authorization: token,
        },
    });

    return response.data.folders;
};

const getClickUpLists = async (folderId) => {
    const response = await axios.get(`${CLICKUP_URL}folder/${folderId}/list`, {
        headers: {
            Authorization: token,
        },
    });

    return response.data.lists;
};

const getClickUpTaskInfo = async (taskId) => {
    try {
        const response = await axios.get(`${CLICKUP_URL}task/${taskId}`, {
            headers: {
                Authorization: token,
            },
        });

        const { url, name } = response.data;

        if (!url || !name) {
            throw new Error('Task URL or Task Name not found in the response.');
        }

        // Return the fetched data
        return { url, name };
    } catch (error) {
        console.error('Error fetching ClickUp task info:', error);
        throw error; // Rethrow the error for higher-level error handling
    }
}

const postTaskComment = async (taskID, commentText) => {
    try {
        const response = axios.post(`${CLICKUP_URL}task/${taskID}/comment`, {
            "comment_text": `${commentText} [API_COMMENT]`,
            "notify_all": false,
            "botComment": true
        },
        {
          headers: {
            Authorization: token,
          },
        });

        console.log('Comment posted successfully:', response.data);
    } catch (error) {
        console.error('Error posting comment to ClickUp:', error.message);
        throw error;
    }
}

module.exports = { getClickUpFolders, getClickUpLists, getClickUpTaskInfo, postTaskComment };
