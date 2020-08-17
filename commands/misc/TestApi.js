const { Command } = require('discord.js-commando');
const primeTimeTable = require('../../api/primeTimeTable.js');

module.exports = class TestAPI extends Command {
    constructor(client) {
        super(client, {
            name: 'testapi',
            group: 'misc',
            memberName: 'testapi',
            description: 'Runs the PrimeTimeTable API. For testing only.',
            ownerOnly: true,
            hidden: true
        });
    }

    async run(msg, args) {
        require('fs').writeFileSync('api.json', JSON.stringify(await primeTimeTable()));
    }
}