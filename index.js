const { Plugin } = require('powercord/entities');
const { i18n: { Messages } } = require('powercord/webpack');
const http = require('powercord/http');
const Settings = require('./settings/Settings');
const isUUID = require('./utils/isUUID');
const getUuid = require('./utils/getUuid');
const BASE_URL = 'https://api.hypixel.net';
const moment = require('moment');
require('moment-duration-format');
const Player = require('./structures/Player');
const Guild = require('./structures/Guild/Guild');

module.exports = class HypixelStats extends Plugin {
  startPlugin () {
    powercord.api.i18n.loadAllStrings(require('./i18n/index.js'));
    powercord.api.settings.registerSettings('hypixel-stats', {
      category: 'powercord-hypixel-stats',
      label: Messages.HYPIXEL_PLUGIN_NAME,
      render: Settings
    });
    this.loadStylesheet('./settings/style.css');
    powercord.api.commands.registerCommand({
      command: 'hypixelplayer',
      aliases: [ 'player', 'hp' ],
      description: Messages.HYPIXEL_COMMAND_PLAYER_DESCRIPTION,
      usage: '{c} [player-nickname]',
      executor: this.player.bind(this)
    });
    powercord.api.commands.registerCommand({
      command: 'hypixelguild',
      aliases: [ 'guild', 'hg' ],
      description: Messages.HYPIXEL_COMMAND_GUILD_DESCRIPTION,
      usage: '{c} [guild-name]',
      executor: this.guild.bind(this)
    });
  }

  async _makeRequest (url, key) {
    if (!url) {
      return;
    }
    if (!key) {
      return {
        error: true,
        send: false,
        result: 'No API Key specified!'
      };
    }
    const validApiKey = await this.validApiKey(key);
    if (validApiKey !== 200) {
      return {
        error: true,
        send: false,
        result: 'Invalid API Key!'
      };
    }
    // eslint-disable-next-line arrow-body-style
    const res = await (http.get(BASE_URL + url + (url.match(/\?/g) ? `&key=${key}` : `?key=${key}`)).set('Accept', 'application/json')).catch((e) => {
      return {
        error: true,
        send: false,
        result: e
      };
    });

    if (res.statusCode === 400) {
      return {
        error: true,
        send: false,
        result: `Code: 400 Bad Request - ${res.body.cause}.`
      };
    }
    if (res.statusCode === 403) {
      return {
        error: true,
        send: false,
        result: `Code: 403 Forbidden - ${res.body.cause}.`
      };
    }
    if (res.statusCode !== 200) {
      return {
        error: true,
        send: false,
        result: 'Try again later.'
      };
    }
    return res.body;
  }

  async validApiKey (key) {
    if (typeof key !== 'string') {
      return false;
    }
    // eslint-disable-next-line arrow-body-style
    const res = await (http.get(`${BASE_URL}/key?key=${key}`).set('Accept', 'application/json')).catch(() => {
      return null;
    });
    if (!res) {
      return 403;
    }

    if (res.statusCode === 403) {
      return 403;
    }
    if (res.statusCode === 200) {
      return 200;
    }
    if (!res.body.success) {
      return false;
    }
  }

  formatNumber (number) {
    // eslint-disable-next-line no-undefined
    return Number.parseFloat(number).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  async player (args) {
    const key = this.settings.get('hypixel-key');
    if (!args[0]) {
      return {
        send: false,
        result: 'No player nickname specified.'
      };
    }
    let query = args[0];
    if (!isUUID(args[0])) {
      const uuid = await getUuid(args[0]);
      if (!uuid) {
        return {
          send: false,
          result: 'Player does not exist.'
        };
      }
      query = uuid;
    }
    const res = await this._makeRequest(`/player?uuid=${query}`, key);
    if (res.error) {
      return {
        send: res.send,
        result: res.result
      };
    }
    if (!res.player) {
      return {
        send: false,
        result: 'Player does not exist.'
      };
    }
    const player = new Player(res.player);
    const resGuild = await this._makeRequest(`/guild?player=${player.uuid}`, key);
    let guild;
    if (!resGuild || !resGuild.guild || resGuild.error) {
      guild = null;
    } else {
      guild = new Guild(resGuild.guild);
    }
    const elapsed = player.isOnline ? moment.duration(Date.now() - player.lastLogin).format('D[d] H[h] m[m] s[s]') : null;
    return {
      send: false,
      result: {
        type: 'rich',
        color: 0x7289da,
        author: {
          name: `${player.rank === 'Default' ? '' : `[${player.rank}] `}${player.nickname}`,
          url: `https://plancke.io/hypixel/player/stats/${player.nickname}`
        },
        thumbnail: {
          url: `https://visage.surgeplay.com/face/64/${player.uuid}.png`,
          proxyURL: `https://visage.surgeplay.com/face/64/${player.uuid}.png`,
          width: 64,
          height: 64
        },
        fields: [
          {
            name: Messages.HYPIXEL_PLAYER_LEVEL,
            value: `\`${player.level}\``,
            inline: true
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: true
          },
          {
            name: Messages.HYPIXEL_PLAYER_GUILD,
            value: `${!guild ? '`No Guild`' : `[${guild.name}${guild.tag ? ` [${guild.tag}]` : ''}](${encodeURI(`https://sk1er.club/guild/name/${guild.name}`)})`}`,
            inline: true
          },
          {
            name: Messages.HYPIXEL_PLAYER_KARMA,
            value: `\`${this.formatNumber(player.karma)}\``,
            inline: true
          },
          {
            name: Messages.HYPIXEL_PLAYER_ACHIEVEMENT_POINTS,
            value: `\`${this.formatNumber(player.achievementPoints)}\``,
            inline: true
          },
          {
            name: Messages.HYPIXEL_PLAYER_STATUS,
            value: player.isOnline ? `Online\n\`for ${elapsed}\`` : `Offline\n\`last login ${moment(player.lastLogin).fromNow()}\``,
            inline: false
          },
          {
            name: Messages.HYPIXEL_PLAYER_SOCIAL_MEDIA,
            value: `${player.socialmedia.length ? player.socialmedia.map(m => `${m.name} - ${m.link.startsWith('http') ? `[click](${m.link})` : `\`${m.link}\``}`).join('\n') : '`None`'}`,
            inline: true
          }
        ]
      }
    };
  }

  async guild (args) {
    const key = this.settings.get('hypixel-key');
    if (!args[0]) {
      return {
        send: false,
        result: 'No guild name specified.'
      };
    }
    const query = args.join(' ');
    const res = await this._makeRequest(`/guild?name=${encodeURIComponent(query)}`, key);
    if (res.error) {
      return {
        send: res.send,
        result: res.result
      };
    }
    if (!res.guild) {
      return {
        send: false,
        result: `Guild (\`${query}\`) does not exist.`
      };
    }
    const guild = new Guild(res.guild);
    if (res.error) {
      return {
        send: res.send,
        result: res.result
      };
    }
    return {
      send: false,
      result: {
        type: 'rich',
        color: 0x7289da,
        author: {
          name: `${guild.name} ${guild.tag ? `[${guild.tag}]` : ''}`,
          url: encodeURI(`https://sk1er.club/guild/name/${guild.name}`)
        },
        fields: [
          {
            name: Messages.HYPIXEL_GUILD_LEVEL,
            value: `\`${guild.level}\``,
            inline: true
          },
          {
            name: Messages.HYPIXEL_GUILD_LEGACYRANK,
            value: `\`${!guild.legacyRank ? 'No legacy rank' : `\`#${guild.legacyRank}\``}\``,
            inline: true
          },
          {
            name: Messages.HYPIXEL_GUILD_CREATION_DATE,
            value: `\`${moment(guild.createdAt).calendar()}\``,
            inline: true
          },
          {
            name: Messages.HYPIXEL_GUILD_MEMBERS,
            value: `\`${guild.members.length}\``,
            inline: true
          },
          {
            name: Messages.HYPIXEL_GUILD_RANKS,
            value: `\`${guild.ranks.length}\``,
            inline: true
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: true
          },
          {
            name: Messages.HYPIXEL_GUILD_DESCRIPTION,
            value: `${guild.description ? guild.description : 'No description'}`,
            inline: false
          },
          {
            name: Messages.HYPIXEL_GUILD_ACHIEVEMENTS,
            value: `${Messages.HYPIXEL_GUILD_ACHIEVEMENTS_WINNERS}: \`${guild.achievements.winners || 0}\`\n${Messages.HYPIXEL_GUILD_ACHIEVEMENTS_EXPKINGS}: \`${guild.achievements.experienceKings}\`\n${Messages.HYPIXEL_GUILD_ACHIEVEMENTS_ONLINE}: \`${guild.achievements.onlinePlayers}\``,
            inline: false
          },
          {
            name: Messages.HYPIXEL_GUILD_PREFERRED_GAMES,
            value: `${guild.preferredGames !== 0 ? guild.preferredGames.map(g => `\`${g}\``).join(', ') : 'No preferred games'}`,
            inline: false
          }
        ]
      }
    };
  }

  pluginWillUnload () {
    powercord.api.commands.unregisterCommand('hypixelplayer');
    powercord.api.settings.unregisterSettings('hypixel-stats');
  }
};
