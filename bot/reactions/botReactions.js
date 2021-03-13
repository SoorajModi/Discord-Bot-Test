const source = require('rfr');

const { addRoleReactionHandler, removeRoleReactionHandler } = source('bot/reactions/roleReaction');
const { getMember } = source('bot/utils/util');

const { Settings } = source('models/settings');
const { Role } = source('models/role');

const logger = source('bot/utils/logger');

function getRoleForReaction(reaction) {
    const message = reaction.message.id;

    return Settings.getServerSettings(reaction.message.guild.id)
        .then((config) => {
            if (message === config.roleMessage) {
                return Role.findRole(config.guildID, reaction.emoji.name);
            }
            return null;
        })
        .catch(() => null);
}

function checkForReactionPartial(reaction) {
    if (reaction.message.partial) {
        try {
            reaction.message.fetch();
        } catch (error) {
            logger.error(error);
            logger.error('encountered error when fetching reaction partial');
        }
    }
}

function addReactionHandler(reaction, user) {
    checkForReactionPartial(reaction);
    getRoleForReaction(reaction)
        .then((mapping) => {
            if (mapping === null) return;
            addRoleReactionHandler(getMember(reaction.message.guild, user), mapping.roleName);
        });
}

function removeReactionHandler(reaction, user) {
    checkForReactionPartial(reaction);
    getRoleForReaction(reaction)
        .then((mapping) => {
            if (mapping === null) return;
            removeRoleReactionHandler(getMember(reaction.message.guild, user), mapping.roleName);
        });
}

module.exports = {
    addReactionHandler,
    removeReactionHandler,
};