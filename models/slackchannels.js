const { Channel } = require('../mongoDB');

const findChannelNameByListName = async (listName) => {
    try {
      const prefixRegex = /\((.*?) ?- ?\d+\)$/; // Regular expression to extract the prefix
      const match = listName.match(prefixRegex);
  
      if (match) {
        const prefix = match[1].toLowerCase(); // Extracted prefix in lowercase
  
        // Query the MongoDB collection for a matching Slack channel
        const matchedChannel = await Channel.findOne({
          channelName: { $regex: `^-${prefix}`, $options: 'i' }, // Case-insensitive search
        });
  
        return matchedChannel ? matchedChannel.channelId : null;
      }
  
      return null; // No match found
    } catch (error) {
      console.error('Error finding Slack channel by list name:', error);
      throw error; // Rethrow the error for higher-level error handling
    }
  };

module.exports = { findChannelNameByListName };