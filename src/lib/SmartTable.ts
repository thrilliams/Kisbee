import fetch from 'node-fetch';
import { PrimeTimeTable, Table } from './PrimeTimeTable';

const getApiUrl = (tableId: string) => `https://primetimetable.com/api/v2/timetables/${tableId}/`;

let table: Table;

export class SmartTable extends PrimeTimeTable {
    static async prepareJson(tableUrl: string) {
        if (!(tableUrl.startsWith('https://primetimetable.com/api/v2/'))) tableUrl = getApiUrl(tableUrl);
        const response = await fetch(tableUrl);
        table = await response.json();
    }

    constructor() {
        if (table !== undefined) {
            super(table);
        } else {
            throw Error('Please call SmartTable.prepareJson before creating a SmartTable!');
        }
    }
}

export default SmartTable;