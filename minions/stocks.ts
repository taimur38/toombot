import { MinionModule, SlackMessage, MinionResult } from '../types'
import * as axios from 'axios';

function* onMessage(message : SlackMessage) : Iterator<Promise<MinionResult>> { 
    const match = message.text.match(/\$(\w+)/);
    if(!match)
        return undefined;
    
    const symbol = match[1];
    console.log(symbol)

    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?formatted=true&crumb=lnRQn70gX0Q&lang=en-US&region=US&modules=summaryProfile%2CfinancialData%2CrecommendationTrend%2CupgradeDowngradeHistory%2Cearnings%2CdefaultKeyStatistics%2CcalendarEvents`

    const chart_url = `https://query2.finance.yahoo.com/v7/finance/chart/${symbol}?range=1mo&interval=5d&indicators=quote&includeTimestamps=true&includePrePost=false`

    return Promise.all([axios.get(url), axios.get(chart_url)])
        .then(res => ({ financials: res[0].data as any, chart: res[1].data as any }))
        .then(compoundResult => {
            //console.log(data.quoteSummary.result);
            const result = compoundResult.financials.quoteSummary.result[0];

            const diff_indicators = compoundResult.chart.chart.result[0].indicators;

            const initialClose = diff_indicators.quote[0].close[0];
            const currentPrice = result.financialData.currentPrice.raw;

            let percent = (currentPrice - initialClose)/initialClose * 100;
            let descriptor = 'up';
            if(percent < 0){
                descriptor = 'down'
                percent = -1 * percent;
            }

            return { 
                text: `current price of ${symbol} is ${currentPrice} - ${descriptor} ${percent.toFixed(2)}% this month. \n Analyst recommendation is to ${result.financialData.recommendationKey}`,
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