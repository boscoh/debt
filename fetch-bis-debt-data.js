const _ = require('lodash')
global.fetch = require('node-fetch')
const fs = require('fs')
const ExcelJS = require('exceljs')

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
    for (let i in _.range(n)) {
        if (
            _.some(
                _.map(keys, k => payload[k][i]),
                _.isNil
            )
        ) {
            continue
        }
        for (let k of keys) {
            result[k].push(payload[k][i])
        }
    }
    return result
}

class BIS {
    async asyncRead (fname, sheetName) {
        // read from a file
        this.workbook = new ExcelJS.Workbook()
        await this.workbook.xlsx.readFile(fname)
        this.sheet = this.workbook.getWorksheet(sheetName)
        this.nCol = this.sheet.columnCount
        this.nRow = this.sheet.rowCount
        console.log(
            'Read',
            fname,
            '-',
            sheetName,
            '-',
            this.nCol,
            'x',
            this.nRow
        )
    }

    getCell (iCol, iRow) {
        return this.sheet.getRow(iRow).getCell(iCol).value
    }

    getHeaders () {
        return _.map(_.range(2, this.nCol + 1), iCol => this.getCell(iCol, 1))
    }

    findIColInHeader (patterns) {
        for (let iCol of _.range(1, this.nCol + 1)) {
            let v = this.getCell(iCol, 1)
            if (_.every(patterns, p => _.includes(v, p))) {
                return iCol
            }
        }
        return null
    }

    getColValues (iCol) {
        return _.map(_.range(5, this.nRow + 1), iRow =>
            this.getCell(iCol, iRow)
        )
    }

    getCountryData(country) {
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
                key: 'householdDebt',
                fn: toBillions,
                matches: [
                    country,
                    'Credit to Households',
                    'All sectors at Market value',
                    'Domestic currency',
                ],
            },
        ]
        for (let pattern of patterns) {
            let i = this.findIColInHeader(pattern.matches)
            if (_.isNil(i)) {
                console.log(`Could't find ${pattern.key} for ${country}`)
            } else {
                if (_.has(pattern, 'fn')) {
                    result[pattern.key] = _.map(this.getColValues(i), toBillions)
                } else {
                    result[pattern.key] = this.getColValues(i)
                }
            }
        }
        result.times = _.map(this.getColValues(1), convertDateStrToInt)
        result = removeBlankValues(result)
        return result
    }

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
        r.gdpPercent = _.map(r.times, t => 100)
        r.householdDebtPercent = combine(
            r.householdDebt,
            r.gdp,
            (a, b) => (a / b) * 100
        )
        r.publicDebtPercent = combine(
            r.publicDebt,
            r.gdp,
            (a, b) => (a / b) * 100
        )
        r.commercialDebtPercent = combine(
            r.commercialDebt,
            r.gdp,
            (a, b) => (a / b) * 100
        )
        r.privateDebtPercent = combine(
            r.privateDebt,
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
        r.keenGrowth = combine(
            r.gdpChange,
            r.credit,
            (a, b) => a + b
        )
        return r
    }
}

async function downloadFile (url, fname) {
    console.log(`Downloading ${url}`)
    const response = await fetch(url)
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(fname, buffer)
}

async function run (url, xlsxFname, jsonFname) {
    await downloadFile(url, xlsxFname)
    let bis = new BIS()
    await bis.asyncRead(xlsxFname, 'Quarterly Series')
    let countries = _.map(bis.getHeaders(), c => _.trim(c.split('-')[0]))
    let result = {}
    for (let country of _.sortBy(_.uniq(countries))) {
        let x = bis.getCountry(country)
        if (_.isEmpty(x)) {
            console.log(`Couldn't find values for ${country}`)
        } else {
            result[country] = x
        }
    }
    fs.writeFileSync(jsonFname, JSON.stringify(result))
    console.log(`Wrote ${jsonFname}`)
}

run(
    'https://www.bis.org/statistics/totcredit/totcredit.xlsx',
    './src/countries/totcredit.xlsx',
    './src/countries/data.json'
)
