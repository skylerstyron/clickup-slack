const { ClickUpList } = require('../mongoDB');

const findListNameByListId = async (listId) => {
  try {
    // Find a document in the MongoDB collection based on listId
    const list = await ClickUpList.findOne({ listId: listId });

    if (list) {
      // Return the listName if a match is found
      return list.listName;
    } else {
      return null; // No match found
    }
  } catch (error) {
    console.error('Error finding list name by listId:', error);
    throw error; // Rethrow the error for higher-level error handling
  }
};

module.exports = { findListNameByListId };
