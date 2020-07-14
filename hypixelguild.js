const moment = require('moment');
require('moment-duration-format');
const http = require('powercord/http');

const formatNumber = require('../utils/formatNumber');

const api_key = '89c522fc-c39a-43c8-9bdb-4e05d8240666';

const Guild = require('../structures/Guild/Guild');

/**
 * @private
 * @param {String} argument
 * @returns {null|Guild}
 */
async function getGuild (argument) {
  let url = 'https://api.hypixel.net';
  url += `/guild?key=${api_key}&name=${encodeURIComponent(argument)}`;
  const res = await http.get(url).catch(e => {
    console.log(e);
    return null;
  });
  return res.body.guild ? new Guild(res.body.guild) : null;
}

module.exports = {
  name: 'hypixelguild',
  aliases: [],
  description: 'Shows information about specified guild',
  usage: '{c} [guild-name]',
  async exec (args) {
    if (!args[0]) {
      return {
        send: false,
        result: 'No guild name specified...'
      };
    }

    const guild = await getGuild(args.join(' '));

    if (!guild) {
      return {
        send: false,
        result: `Guild \`${args.join(' ')}\` does not exist\n\nIf guild does exists contact StavZ#6469`
      };
    }

    return {
      send: false,
      result: {
        type: 'rich',
        color: 0xff8c00,
        author: {
          name: `${guild.name} ${guild.tag.string ? `[${guild.tag.string}]` : ''}`,
          url: `https://sk1er.club/guild/name/${guild.name.replace(/ +/g, '+')}`
        },
        fields: [
          {
            name: 'Guild Level',
            value: `\`${guild.level}\``,
            inline: true
          },
          {
            name: 'Legacy Rank',
            value: `${isNaN(guild.legacyRank) || !guild.legacyRank ? 'No legacy rank' : `\`#${guild.legacyRank}\``}`,
            inline: true
          },
          {
            name: 'Creation Date',
            value: `\`${moment(guild.createdAt).calendar()}\``,
            inline: true
          },
          {
            name: 'Members',
            value: `\`${guild.members.length}\``,
            inline: true
          },
          {
            name: 'Ranks',
            value: `\`${guild.ranks.length}\``,
            inline: true
          },
          {
            name: 'Description',
            value: `\`${guild.description ? guild.description : 'No description'}\``,
            inline: false
          },
          {
            name: 'Achievements',
            value: `Winners: \`${guild.achievements.winners || 0}\`\nExpirience Kings: \`${formatNumber(guild.achievements.experienceKings)}\`\nOnline: \`${guild.achievements.onlinePlayers}\``
          },
          {
            name: 'Preffered Games',
            value: `${guild.preferredGames.length !== 0 ? guild.preferredGames.map(g => `\`${g}\``).join(', ') : 'No preferred games'}`
          }
        ]
      }
    };
  }
};
