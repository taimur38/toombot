import * as axios from 'axios';

function queryCrypto(symbol) {
  console.log(symbol);
  return axios.get(`https://api.cryptonator.com/api/ticker/${symbol}-usd`)
  .then(res => {
      console.log(res.data)
      return (res.data as any).ticker;
  })
  .then((ticker : any) => { 
      
      const up = ":green_arrow_up:"
      const down = ":red_arrow_down:"
      const formattedPrice = parseFloat(ticker.price).toFixed(2);
      const dayModifier = parseFloat(ticker.change) > 0 ? up : down;
      const formattedChange = parseFloat(ticker.change) > 0 ? parseFloat(ticker.change).toFixed(2) : (-1 * parseFloat(ticker.change)).toFixed(2);

      return {
          text: [
              `Current: $${formattedPrice}`,
              `Hour: ${up} ${formattedChange}%`
          ].join("\n"),
          send: true
      }

  })
}

function* onMessage(message : SlackMessage) : Iterator<Promise<MinionResult>> {
    const crypto = message.text.match(/\$\$(\w+)/);
    console.log(crypto)
    if (crypto) {
      console.log('woo')
      return queryCrypto(crypto[1])
    }

    const match = message.text.match(/\$(\w+)/);
    if(!match)
        return undefined;

    const symbol = match[1];

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

            const closes = diff_indicators.quote[0].close;
            const opens = diff_indicators.quote[0].open;
            const initialClose= closes[0];
            const initialDay = closes[opens.length - 2];
            //ronst currentPrice = closes[closes.length - 1];
            const currentPrice = isETF ? closes[closes.length - 1] : result.financialData.currentPrice.raw;

            let percent = (currentPrice - initialClose)/initialClose * 100;
            const up = ":green_arrow_up:"
            const down = ":red_arrow_down:"
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

            if(!isETF) {
                const officers = result.assetProfile.companyOfficers;
                const bigBoss = officers.sort((a, b) => (b.totalPay ? b.totalPay.raw : 0) - (a.totalPay ? a.totalPay.raw : 0))[0];

                if(bigBoss.totalPay && bigBoss.totalPay.fmt)
                    ceoInfo = `The highest paid officer is ${bigBoss.name}, the ${bigBoss.title} who makes ${bigBoss.totalPay.fmt}`;
            }

            const base = `*${symbol}: ${name}*\nCurrent:   $${currentPrice.toFixed(2)}\nToday:    ${dayDescrip} ${dayPercent.toFixed(2)}%\nMonth:   ${descriptor} ${percent.toFixed(2)}%`
            if(isETF){
                return {
                    text: base
                }
            }
            const lines = [
                base,
                `Forward P/E: ${result.defaultKeyStatistics.forwardPE.fmt}`,
                `Analyst recommendation: *${result.financialData.recommendationKey.toUpperCase()}* based on ${result.financialData.numberOfAnalystOpinions.fmt} Analyst Opinions.`,
                ceoInfo
            ];

            return {
                text: lines.join('\n')
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
