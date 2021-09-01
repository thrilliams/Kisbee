import { Discord, Permission, Slash, SlashGroup, SlashOption } from 'discordx';
import { CommandInteraction, MessageEmbed } from 'discord.js';
import { Document, model, Schema } from 'mongoose';

const infoSchema = new Schema({
    name: String,
    value: String
});

interface IItem extends Document {
    name: string,
    value: string
}

const Item = model<IItem>('Item', infoSchema);

@Discord()
@SlashGroup('info', 'Commands for manipulating useful information.')
abstract class Info {
    @Slash('get', { description: 'Retrieve helpful information on a link, or all links when called with no arguments.' })
    async get(
        @SlashOption('name', { description: 'The name of an item to view.' }) name: string,
        interaction: CommandInteraction
    ) {
        let items: IItem[];
        if (name !== undefined) {
            items = await Item.find({ name: name }).exec();
        } else {
            items = await Item.find({}).exec();
        }
        if (items.length > 0) {
            let embed = new MessageEmbed();
            for (let item of items) embed.addField(item.name, item.value);
            interaction.reply({ embeds: [embed] });
        } else {
            interaction.reply('No items found.');
        }
    }

    @Permission({ id: '294625075934527495', type: 'USER', permission: true })
    @Slash('set', { description: 'Set helpful information.', defaultPermission: false })
    async set(
        @SlashOption('name', { description: 'The name of an item to set.', required: true }) name: string,
        @SlashOption('value', { description: 'The value to set. Leave this blank to delete the entry.' }) value: string,
        interaction: CommandInteraction
    ) {
        let item = await Item.findOne({ name: name }).exec();
        if (item !== null) await item.remove();
        if (value !== undefined) {
            item = await Item.create({ name, value });
            let embed = new MessageEmbed();
            embed.addField(item.name, item.value);
            interaction.reply({ embeds: [embed] });
        } else {
            interaction.reply(`Deleted ${name}.`);
        }
    }
}