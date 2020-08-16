import CommandLayer from './CommandLayer.js';

const commands = [
    {
        name: 'createchannels',
        elegibility: {
            type: 'hasPerm',
            value: 'MANAGE_CHANNELS'
        },
        exec: async function (message) {
            
        }
    }
]

export default new CommandLayer(commands);