const basic = require('./basic');
const downloaders = require('./downloaders');
const aiTools = require('./ai_tools');
const groupAdmin = require('./group_admin');
const fun = require('./fun');
const owner = require('./owner');

const commands = {
    ...basic,
    ...downloaders,
    ...aiTools,
    ...groupAdmin,
    ...fun,
    ...owner,
};

module.exports = commands;
