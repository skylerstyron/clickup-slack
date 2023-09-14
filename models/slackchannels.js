const { Channel } = require('../mongoDB');

const findChannelNameByListName = async (listName) => {
  try {
    const prefixRegex = /\((.*?) ?- ?\d+\)$/; // Regular expression to extract the prefix
    const match = listName.match(prefixRegex);

    // Try to find a match using the regular expression
    if (match) {
      const prefix = match[1].toLowerCase(); // Extracted prefix in lowercase

      // Query the MongoDB collection for a matching Slack channel using the regular expression
      const matchedChannelRegex = await Channel.findOne({
        channelName: { $regex: `^-${prefix}`, $options: 'i' },
      });

      if (matchedChannelRegex) {
        return matchedChannelRegex.channelId;
      }
    } else {

      // If no match is found using the regular expression, try matching the first three characters
      const regEx = /\((.*?) ?-/;
      const fallbackMatch = listName.match(regEx);

      const matchedChannelFallback = await Channel.findOne({
        channelName: { $regex: `^-${prefix}`, $options: 'i' },
      });
      console.log('Fallback Channel: ' + matchedChannelFallback.channelName);

      return matchedChannelFallback ? matchedChannelFallback.channelId : null;
    }

  } catch (error) {
    console.error('Error finding Slack channel by list name:', error);
    throw error; // Rethrow the error for higher-level error handling
  }
};

module.exports = { findChannelNameByListName };