import client from './index.js';

export default class CommandLayer {
    constructor(commands) {
        this.commands = commands;
    }

    eligible(elegibility, author) {
        if (elegibility === undefined || elegibility.type === undefined) {
            return true;
        } else if (elegibility.type === 'hasPerm') {
            return author.hasPermission(elegibility.value);
        } else if (elegibility.type === 'hasRole') {
            return author.roles.cache.has(elegibility.value);
        } else if (elegibility.type === 'each') {
            let eligible = true;
            for (let item of elegibility.value) {
                if (!this.eligible(item, author)) eligible = false;
            }
            return eligible;
        } else if (elegibility.type === 'any') {
            let eligible = false;
            for (let item of elegibility.value) {
                if (this.eligible(item, author)) eligible = true;
            }
            return eligible;
        } else {
            console.log('No valid permissions found, defaulting to false.')
            return false;
        }
    }

    handleCommand(message) {
        for (let command of this.commands) {
            if (message.content.startsWith(command.name)) {
                message.content = message.content.trim().split();
                if (this.eligible(command.elegibility, message.author)) {
                    command.exec.call(this, message, message.content, client);
                } else {
                    message.channel.send('You are not authorized to run that command.');
                }
                return true;
            }
        }
        return false;
    }

    getUserInput(startingMessage) {
        return new Promise((resolve, reject) => {
            setTimeout(() => reject('You took too long to respond. Please try again.'), 10000);

            function receiveMessage(message) {
                if (message.channel.id === startingMessage.channel.id && message.author.id === startingMessage.author.id) {
                    resolve(message);
                    client.removeListener('message', receiveMessage);
                }
            }

            client.addListener('message', receiveMessage);
        });
    }
}