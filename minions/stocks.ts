import { MinionModule, SlackMessage, MinionResult } from '../types'
import * as axios from 'axios';

function* onMessage(message : SlackMessage) : Iterator<Promise<MinionResult>> { 
    const match = message.text.match(/\$(\w+)/);
    if(!match)
        return undefined;
    
    const symbol = match[1];
    console.log(symbol)

    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?formatted=true&crumb=lnRQn70gX0Q&lang=en-US&region=US&modules=summaryProfile%2CfinancialData%2CrecommendationTrend%2CupgradeDowngradeHistory%2Cearnings%2CdefaultKeyStatistics%2CcalendarEvents`

    return axios.get(url)
        .then(res => res.data)
        .then((data : any) : MinionResult => {
            //console.log(data.quoteSummary.result);
            const result = data.quoteSummary.result[0];

            return { 
                text: `current price of ${symbol} is ${result.financialData.currentPrice.fmt}. Analyst recommendation is to ${result.financialData.recommendationKey}`,
                threadReply: true
            }
        })
        .catch(err => {
            console.error('stocks: ' + err);
            console.error(url);
        })


}

const mod : MinionModule = {
    onMessage,
    key: 'stocks',
    filter: (msg : SlackMessage) => msg.text.search(/\$(\w+)/) > -1
}

export default mod;