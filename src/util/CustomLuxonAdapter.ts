import AdapterLuxon from "@mui/lab/AdapterLuxon";
import { DateTime } from "luxon";

// Luxon weeks start on Monday, so this custom adapter shifts it so that
// the week starts on a Sunday instead as is custom in the US (and other places)
// Plus, this gives the opportunity to change Thursday to R.
// Based on https://github.com/mui-org/material-ui-pickers/issues/1626#issuecomment-612031743
export default class CustomAdapterLuxon extends AdapterLuxon {
    getWeekdays = () => ['S', 'M', 'T', 'W', 'R', 'F', 'S'];

    constructor() {
        super();
        
        const _getWeekArray = this.getWeekArray;
        this.getWeekArray = (date: DateTime) => {
            const startOnMondayWeeks = _getWeekArray(date);
            const shiftedWeeks = startOnMondayWeeks.map(x => x.map(x => x.minus({ days: 1 })));

            // Remove a week if the first day of the month was on a sunday
            if (shiftedWeeks[0][6].month !== date.month) {
                shiftedWeeks.shift();
            }

            // Add an extra week if the last day of the month was a sunday
            const lastDay = shiftedWeeks[shiftedWeeks.length - 1][6];
            if (lastDay.plus({ days: 1 }).month === date.month) {
                shiftedWeeks.push(new Array<DateTime>(7).fill(lastDay).map((x, i) => x.plus({ days: i + 1 })));
            }
            
            return shiftedWeeks;
        };
    }
}