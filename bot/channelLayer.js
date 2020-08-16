import CommandLayer from './CommandLayer.js';

const commands = [
    {
        name: 'createchannels',
        desc: 'Finds existing channels for each subject and creates channels if they don\'t exist. Requires the Manage Channels permission.',
        elegibility: {
            type: 'hasPerm',
            value: 'MANAGE_CHANNELS'
        },
        exec: async function (message) {

        }
    }
]

export default new CommandLayer(commands, 'channels');