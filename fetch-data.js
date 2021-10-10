const _ = require('lodash')
const fetch = require('node-fetch')
const fs = require('fs')
const XLSX = require('xlsx')

async function downloadFile (url, fname) {
    console.log(`Download ${url}`)
    const response = await fetch(url)
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(fname, buffer)
}

class SimpleXLS {
    /*
     * Functional 0-index wrapper over XLSX objects
     */
    constructor (fname, sheetName) {
        this.workbook = XLSX.readFile(fname, {cellDates: true})
        this.sheet = this.workbook.Sheets[sheetName]
        const range = XLSX.utils.decode_range(this.sheet['!ref'])
        this.nRow = range.e.r - range.s.r + 1
        this.nCol = range.e.c - range.s.c + 1
        console.log(
            `Read ${fname} - ${sheetName} - ${this.nCol} x ${this.nRow}`
        )
    }

    getCell (iCol, iRow) {
        let value = this.sheet[XLSX.utils.encode_cell({ r: iRow, c: iCol })]
        if (_.isNil(value)) {
            return null
        }
        return value.v
    }

    getRow (iRow) {
        return _.map(_.range(this.nCol), iCol => this.getCell(iCol, iRow))
    }

    getColumn (iCol) {
        return _.map(_.range(this.nRow), iRow => this.getCell(iCol, iRow))
    }
}

function expandValues (aList, n) {
    let chunks = _.map(_.range(n), i => i / n)
    let result = []
    let nList = aList.length
    for (let i = 0; i < nList - 1; i += 1) {
        let y = aList[i]
        let yNext = aList[i + 1]
        let yDiff = yNext - y
        for (let chunk of chunks) {
            result.push(y + yDiff * chunk)
        }
    }
    return result
}

/*
 * @return {
 *    <country>: list<float> - population by time
 *    time: list<float> - year converted to decimal for quarterly series
 * }
 */
async function getPopulationByCountry (xlsFname) {
    let xls = new SimpleXLS(xlsFname, 'Data')
    let countries = _.slice(xls.getColumn(0), 4)
    let times = _.map(_.slice(xls.getRow(3), 4), _.parseInt)
    let populationByCountry = {}
    for (let i = 0; i < countries.length; i += 1) {
        let country = countries[i]
        let values = _.slice(xls.getRow(i + 4), 4)
        populationByCountry[country] = expandValues(values, 4)
    }
    populationByCountry.times = expandValues(times, 4)
    return populationByCountry
}

function convertDateStrToInt (s) {
    let time = new Date(Date.parse(s))
    return time.getFullYear() + (time.getMonth() - 2) / 12.0
}

function diff (values) {
    if (_.isNil(values)) {
        return null
    }
    let result = [0]
    for (let i of _.range(1, values.length)) {
        let a = values[i - 1]
        let b = values[i]
        let isBad = _.isNil(a) || _.isNil(b)
        result.push(isBad ? null : b - a)
    }
    return result
}

function combine (listA, listB, fn) {
    if (_.isNil(listA) || _.isNil(listB)) {
        return null
    }
    let result = []
    for (let x of _.zip(listA, listB)) {
        let a = x[0]
        let b = x[1]
        let isBad = _.isNil(a) || _.isNil(b)
        result.push(isBad ? null : fn(a, b))
    }
    return result
}

function removeBlankValues (payload) {
    let keys = _.keys(payload)
    let result = {}
    for (let k of keys) {
        result[k] = []
    }
    let n = payload[keys[0]].length

    let valueKeys = _.dropRight(keys)
    for (let i in _.range(n)) {
        if (
            _.every(
                _.map(valueKeys, k => payload[k][i]),
                v => _.isNil(v) || v === 0
            )
        ) {
            continue
        }
        for (let k of keys) {
            let value = payload[k][i]
            if (value === 0) {
                value = null
            }
            result[k].push(value)
        }
    }
    return result
}

class BIS extends SimpleXLS {
    getHeaders () {
        return _.map(_.range(1, this.nCol), iCol => this.getCell(iCol, 0))
    }

    findIColInHeader (patterns) {
        for (let iCol of _.range(this.nCol)) {
            let v = this.getCell(iCol, 0)
            if (_.every(patterns, p => _.includes(v, p))) {
                return iCol
            }
        }
        return null
    }

    getColValues (iCol) {
        return _.map(_.range(4, this.nRow), iRow => this.getCell(iCol, iRow))
    }

    getCountryData (country) {
        let result = {}
        const toBillions = d => d * 1e9
        let patterns = [
            {
                key: 'privateDebtPercent',
                matches: [
                    country,
                    'Credit to Non financial sector',
                    'All sectors at Market value',
                    'Percentage of GDP',
                ],
            },
            {
                key: 'privateDebt',
                fn: toBillions,
                matches: [
                    country,
                    'Credit to Non financial sector',
                    'All sectors at Market value',
                    'Domestic currency',
                ],
            },
            {
                key: 'privateDebtUsd',
                fn: toBillions,
                matches: [
                    country,
                    'Credit to Non financial sector',
                    'All sectors at Market value',
                    'US dollar',
                ],
            },
            {
                key: 'publicDebtPercent',
                matches: [
                    country,
                    'Credit to General government',
                    'All sectors at Market value',
                    'Percentage of GDP',
                ],
            },
            {
                key: 'publicDebt',
                fn: toBillions,
                matches: [
                    country,
                    'Credit to General government',
                    'All sectors at Market value',
                    'Domestic currency',
                ],
            },
            {
                key: 'publicDebtUsd',
                fn: toBillions,
                matches: [
                    country,
                    'Credit to General government',
                    'All sectors at Market value',
                    'US dollar',
                ],
            },
            {
                key: 'householdDebt',
                fn: toBillions,
                matches: [
                    country,
                    'Credit to Households',
                    'All sectors at Market value',
                    'Domestic currency',
                ],
            },
            {
                key: 'householdDebtPercent',
                matches: [
                    country,
                    'Credit to Households',
                    'All sectors at Market value',
                    'Percentage of GDP',
                ],
            },
            {
                key: 'householdDebtUsd',
                fn: toBillions,
                matches: [
                    country,
                    'Credit to Households',
                    'All sectors at Market value',
                    'US dollar',
                ],
            },
        ]
        for (let pattern of patterns) {
            let i = this.findIColInHeader(pattern.matches)
            if (_.isNil(i)) {
                console.log(
                    `Could't find header [${pattern.key}] for ${country}`
                )
            } else {
                if (_.has(pattern, 'fn')) {
                    result[pattern.key] = _.map(
                        this.getColValues(i),
                        toBillions
                    )
                } else {
                    result[pattern.key] = this.getColValues(i)
                }
            }
        }
        result.times = _.map(this.getColValues(0), convertDateStrToInt)
        result = removeBlankValues(result)
        return result
    }

    /**
     * @param country - str
     * @returns - {
     *    time: [float] - 1990, 1990.25 etc.
     *    gdp: [float]
     *    gdpPercent: [float] - values 0-100
     *    <other>
     * }
     */
    getCountry (country) {
        let r = this.getCountryData(country)
        if (r.times.length === 0) {
            return {}
        }
        r.commercialDebt = combine(
            r.privateDebt,
            r.householdDebt,
            (a, b) => a - b
        )
        r.gdp = combine(
            r.privateDebt,
            r.privateDebtPercent,
            (a, b) => (a / b) * 100
        )
        r.gdpUsd = combine(
            r.privateDebtUsd,
            r.privateDebtPercent,
            (a, b) => (a / b) * 100
        )
        r.gdpPercent = _.map(r.times, t => 100)
        r.commercialDebtPercent = combine(
            r.commercialDebt,
            r.gdp,
            (a, b) => (a / b) * 100
        )
        r.gdpChange = diff(r.gdp)
        r.allDebtPercent = combine(
            r.privateDebtPercent,
            r.publicDebtPercent,
            (a, b) => a + b
        )
        r.creditPercent = diff(r.privateDebtPercent)
        r.credit = diff(r.privateDebt)
        r.keenGrowth = combine(r.gdpChange, r.credit, (a, b) => a + b)
        r.commercialDebtUsd = combine(
            r.privateDebtUsd,
            r.householdDebtUsd,
            (a, b) => a - b
        )
        return r
    }
}

async function getDebtByCountry (xlsxFname) {
    let bis = new BIS(xlsxFname, 'Quarterly Series')
    let countries = _.map(bis.getHeaders(), c => _.trim(c.split('-')[0]))
    let result = {}
    for (let country of _.sortBy(_.uniq(countries))) {
        let x = bis.getCountry(country)
        if (_.isEmpty(x)) {
            console.log(`Skipping: couldn't find values for ${country}`)
            continue
        }
        result[country] = x
    }
    return result
}

function addPopulation (dataByCountry, jsonFname) {
    let rawdata = fs.readFileSync(jsonFname)
    let populationByCountry = JSON.parse(rawdata)
    const populationTimes = populationByCountry.times
    for (let country of _.keys(dataByCountry)) {
        let countryData = dataByCountry[country]
        if (!(country in populationByCountry)) {
            continue
        }
        let popByTime = {}
        let population = populationByCountry[country]
        let n = populationTimes.length
        for (let i = 0; i < n; i += 1) {
            let time = populationTimes[i]
            popByTime[time] = population[i]
        }
        countryData.population = []
        for (let t of countryData.times) {
            countryData.population.push(popByTime[t])
        }
        countryData.gdpPerCapita = combine(
            countryData.gdp,
            countryData.population,
            (a, b) => a / b
        )
        countryData.gdpChangePerCapita = diff(countryData.gdpPerCapita)
        countryData.gdpPerCapitaUsd = combine(
            countryData.gdpUsd,
            countryData.population,
            (a, b) => a / b
        )
    }
}

async function run () {
    const populationUrl =
        'https://api.worldbank.org/v2/en/indicator/SP.POP.TOTL?downloadformat=excel'
    const populationXls = './src/countries/worldbank.pop.xls'
    await downloadFile(populationUrl, populationXls)
    const populationData = await getPopulationByCountry(populationXls)

    const populationJson = './src/countries/population.json'
    fs.writeFileSync(populationJson, JSON.stringify(populationData))
    console.log(`Save ${populationJson}`)

    const debtUrl = 'https://www.bis.org/statistics/totcredit/totcredit.xlsx'
    const debtXlsx = './src/countries/totcredit.xlsx'
    await downloadFile(debtUrl, debtXlsx)
    let debtData = await getDebtByCountry(debtXlsx)
    addPopulation(debtData, populationJson)

    const dataJson = './src/countries/data.json'
    fs.writeFileSync(dataJson, JSON.stringify(debtData))
    console.log(`Save ${dataJson}`)
}

run()
