import _ from 'lodash'
import dataByCountry from './data.json'
import countryCodes from 'country-codes-list'
import getSymbolFromCurrency from 'currency-symbol-map'

const codeByName = countryCodes.customList('countryNameEn', '{currencyCode}')

function getCurrency(country) {
    for (let [name, code] of _.toPairs(codeByName)) {
        if (_.includes(name, country)) {
            let currency = getSymbolFromCurrency(code)
            console.log(`${country} - ${code} - ${currency}`)
            return currency
        }
    }
    return 'CUR'
}

function makeCountryPageLayout(country) {
    const currency = getCurrency(country)
    const dataByKey = _.cloneDeep(dataByCountry[country])
    return {
        path: `/${_.kebabCase(country)}`,
        name: country,
        title: `${country}`,
        times: dataByKey.times,
        dataByKey,
        charts: [
            {
                title: `Debt to GDP (${currency})`,
                markdown: '',
                keys: ['privateDebt', 'publicDebt', 'gdp'],
                ymin: 0,
                xlabel: 'Year',
                ylabel: currency,
            },
            {
                title: `Household/Commercial/Public Debt (${currency})`,
                markdown: '',
                keys: ['householdDebt', 'commercialDebt', 'publicDebt', 'gdp'],
                ymin: 0,
                xlabel: 'Year',
                ylabel: currency,
            },
            {
                title: 'Credit = ΔDebt (%GDP)',
                // language=markdown
                markdown: ``,
                keys: ['creditPercent'],
                isUp: true,
                isSymmetryY: true,
                xlabel: 'Year',
                ylabel: '%',
            },
            {
                title: `Credit = ΔDebt (${currency})`,
                // language=markdown
                markdown: ``,
                keys: ['credit'],
                isUp: true,
                isSymmetryY: true,
                xlabel: 'Year',
                ylabel: currency,
            },
            {
                title: 'Private Debt (%GDP)',
                markdown: ``,
                keys: ['privateDebtPercent'],
                isUp: true,
                isSymmetryY: false,
                ymin: 0,
                xlabel: 'Year',
                ylabel: '%',
            },
            {
                title: `ΔGDP (${currency})`,
                markdown: '',
                keys: ['gdpChange'],
                isUp: true,
                isSymmetryY: true,
                ymin: 0,
                xlabel: 'Year',
                ylabel: currency,
            },
            {
                title: `Keen Growth (ΔGDP + ΔDebt) (${currency})`,
                markdown: '',
                keys: ['keenGrowth'],
                isUp: true,
                isSymmetryY: true,
                xlabel: 'Year',
                ylabel: currency,
            },
        ],
    }
}

export default _.map(_.keys(dataByCountry), makeCountryPageLayout)
