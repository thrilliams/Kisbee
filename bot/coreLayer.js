import CommandLayer from './CommandLayer.js';

const commands = [
    {
        name: 'help',
        desc: 'This!',
        exec: function (message) {
            if (message.content.length > 0) {
                let possibleLayers = this.layers.filter(layer => layer.name === message.content[0]);
                if (possibleLayers.length === 1) {
                    message.channel.send(possibleLayers[0].generateHelp());
                } else {
                    message.channel.send('Kisbee could not find a category with that name.');
                }
            } else {
                message.channel.send(this.layers.map(layer => layer.generateHelp()).join('\n'));
            }
        }
    },
    {
        name: 'whoami',
        desc: 'Returns your discord ID.',
        exec: function (message) {
            message.reply(message.author.user.id);
        }
    }
]

export default class CoreLayer extends CommandLayer {
    constructor(layers) {
        super(commands, 'core');
        this.layers = layers;
    }
}