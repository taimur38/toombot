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
    const disambiguateURL = `http://d.yimg.com/aq/autoc?query=${symbol}&region=US&lang=en-US`

    return Promise.all([axios.get(url), axios.get(chart_url), axios.get(disambiguateURL)])
        .then(res => ({ financials: res[0].data as any, chart: res[1].data as any, disambiguate: res[2].data as any }))
        .then(compoundResult => {
            //console.log(data.quoteSummary.result);
            const result = compoundResult.financials.quoteSummary.result[0];

            const isETF = result.fundPerformance !== undefined;

            const name = compoundResult.disambiguate.ResultSet.Result[0].name;
            const diff_indicators = compoundResult.chart.chart.result[0].indicators;

            let ceoInfo = '';
            if(!isETF) {
                const officers = result.assetProfile.companyOfficers;
                const bigBoss = officers.sort((a, b) => b.totalPay.raw - a.totalPay.raw)[0];

                ceoInfo = `The highest paid officer is ${bigBoss.name} the ${bigBoss.title} who makes ${bigBoss.totalPay.fmt}`;
            }

            const closes = diff_indicators.quote[0].close;
            const opens = diff_indicators.quote[0].open;
            const initialClose= closes[0];
            const initialDay = closes[opens.length - 2];
            //ronst currentPrice = closes[closes.length - 1];
            const currentPrice = isETF ? closes[closes.length - 1] : result.financialData.currentPrice.raw;

            let percent = (currentPrice - initialClose)/initialClose * 100;
            const up = ":arrow_up_small:"
            const down = ":arrow_down_small:"
            let descriptor = up;
            if(percent < 0){
                descriptor = down; 
                percent = -1 * percent;
            }

            let dayDescrip = up; 
            let dayPercent = (currentPrice - initialDay)/initialDay * 100;
            if(dayPercent < 0) {
                dayDescrip = down; 
                dayPercent = -1 * dayPercent;
            }

            const base = `*${symbol}: ${name}*\nCurrent:   $${currentPrice.toFixed(2)}\nToday:    ${dayDescrip} ${dayPercent.toFixed(2)}%\nMonth:   ${descriptor} ${percent.toFixed(2)}%`
            if(isETF){
                return {
                    text: base
                }
            }
            return { 
                text: `${base}\nAnalyst recommendation: ${result.financialData.recommendationKey}\n${ceoInfo}`
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