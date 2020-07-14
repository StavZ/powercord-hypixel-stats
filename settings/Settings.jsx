const { React, i18n: { Messages } } = require('powercord/webpack');
const { TextInput } = require('powercord/components/settings');
class Settings extends React.Component {
  constructor (props) {
    super(props);
    this.plugin = powercord.pluginManager.get('powercord-hypixel-stats');
  }

  render () {
    const { getSetting, updateSetting } = this.props;
    return (
      <div>
        <TextInput className="api-key-input" defaultValue={getSetting('hypixel-key', '')} onChange={val => updateSetting('hypixel-key', val)} required={true} note={Messages.HYPIXEL_SETTING_NOTE}>{Messages.HYPIXEL_SETTING_NAME}</TextInput>
      </div>
    );
  }
}
module.exports = Settings;
