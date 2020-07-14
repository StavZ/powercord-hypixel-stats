const http = require('powercord/http');

/**
 * @param {string} name
 * @returns {Promise<string>}
 */

module.exports = async (name) => {
  let uuid;
  try {
    const res = await http.get(`https://api.mojang.com/users/profiles/minecraft/${name}`).set('Accept', 'application/json');
    if (!res.body) {
      return null;
    }

    if (res.status && res.status === 204) {
      uuid = null;
    } else {
      uuid = res.body.id;
    }
    return uuid;
  } catch (e) {
    uuid = null;
    return uuid;
  }
};
