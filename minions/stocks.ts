import { MinionModule, SlackMessage, MinionResult } from '../types'
import * as axios from 'axios';

function* onMessage(message : SlackMessage) : Iterator<Promise<MinionResult>> { 
    const match = message.text.match(/\$(\w+)/);
    if(!match)
        return undefined;
    
    const symbol = match[1];
    console.log(symbol)

    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?formatted=true&crumb=lnRQn70gX0Q&lang=en-US&region=US&modules=summaryProfile,financialData,recommendationTrend,upgradeDowngradeHistory,earnings,defaultKeyStatistics,calendarEvents,assetProfile,topHoldings,fundPerformance,fundProfile`;

    const chart_url = `https://query2.finance.yahoo.com/v7/finance/chart/${symbol}?range=1mo&interval=1d&indicators=quote&includeTimestamps=true&includePrePost=false`

    return Promise.all([axios.get(url), axios.get(chart_url)])
        .then(res => ({ financials: res[0].data as any, chart: res[1].data as any }))
        .then(compoundResult => {
            //console.log(data.quoteSummary.result);
            const result = compoundResult.financials.quoteSummary.result[0];

            const isETF = result.fundPerformance !== undefined;

            const diff_indicators = compoundResult.chart.chart.result[0].indicators;

            const closes = diff_indicators.quote[0].close;
            const opens = diff_indicators.quote[0].open;
            const initialClose= closes[0];
            //const currentPrice = isETF ? result.result.financialData.currentPrice.raw;
            const currentPrice = closes[closes.length - 1];

            let percent = (currentPrice - initialClose)/initialClose * 100;
            let descriptor = 'up';
            if(percent < 0){
                descriptor = 'down'
                percent = -1 * percent;
            }

            let dayDescrip = 'up'
            let dayPercent = (currentPrice - opens[opens.length - 1])/opens[opens.length - 1] * 100;
            if(dayPercent < 0) {
                dayDescrip = 'down'
                dayPercent = -1 * dayPercent;
            }

            const base = `current price of ${symbol} is ${currentPrice.toFixed(2)}.\n${dayDescrip} ${dayPercent.toFixed(2)}% today.\n${descriptor} ${percent.toFixed(2)}% this month.`
            if(isETF){
                return {
                    text: base
                }
            }
            return { 
                text: `${base}\n Analyst recommendation is to ${result.financialData.recommendationKey}`
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