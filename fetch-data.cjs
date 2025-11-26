const _ = require('lodash')
const fetch = require('node-fetch')
const fs = require('fs')
const XLSX = require('xlsx')
const { parse } = require('csv-parse/sync')

async function downloadFile (url, fname) {
    console.log(`Download ${url}`)
    const response = await fetch(url)
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(fname, buffer)
}

/**
 * Functional 0-index wrapper over XLSX objects
 */
class SimpleXLS {
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

/**
 * @return {{
 *     country1: number[],
 *     country2: number[],
 *     time: number
 * }}
 */
function getPopulationByCountry (xlsFname) {
    let xls = new SimpleXLS(xlsFname, 'Data')
    let result = {}
    let countries = _.slice(xls.getColumn(0), 4)
    for (let i = 0; i < countries.length; i += 1) {
        let country = countries[i]
        let values = _.slice(xls.getRow(i + 4), 4)
        result[country] = expandValues(values, 4)
    }
    let times = _.map(_.slice(xls.getRow(3), 4), _.parseInt)
    result.times = expandValues(times, 4)
    return result
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

class BisXls extends SimpleXLS {
    constructor(xlsFname) {
        super(xlsFname, 'Quarterly Series')
    }

    getCountries () {
        let headers = _.map(_.range(1, this.nCol), iCol => this.getCell(iCol, 0))
        return _.uniq(_.map(headers, c => _.trim(c.split('-')[0])))
    }

    /**
     * Find the header that contains all the strings in the pattern
     * @param patternStrings {string[]}
     * @returns {null|number}
     */
    findIColInHeader (patternStrings) {
        for (let iCol of _.range(this.nCol)) {
            let v = this.getCell(iCol, 0)
            if (_.every(patternStrings, p => _.includes(v, p))) {
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
     * @param country {string}
     * @returns {{
     *    time: [number],
     *    gdp: [number],
     *    gdpPercent: [number],
     *    moreProperty: [number],
     * }}
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

/**
 * Parse new BIS CSV format (SDMX columnar format)
 * @return {{country1: object, country2: object}}
 */
function getDebtByCountryCsv (csvFname) {
    console.log(`Reading CSV file ${csvFname}`)
    const fileContent = fs.readFileSync(csvFname, 'utf-8')
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    })
    
    const result = {}
    const countryData = {}
    
    // Group records by country
    for (let record of records) {
        const country = record['Borrowers\' country']
        const sector = record['Borrowing sector']
        const unitType = record['Unit type']
        const valuation = record['Valuation method']
        const adjustment = record['Adjustment']
        const measure = record['Unit of measure']
        
        if (!country) continue
        
        if (!countryData[country]) {
            countryData[country] = {}
        }
        
        // Create a key for this time series based on dimensions
        let key = `${sector}|${valuation}|${unitType}|${measure}|${adjustment}`
        
        if (!countryData[country][key]) {
            countryData[country][key] = {
                sector,
                valuation,
                unitType,
                measure,
                adjustment,
                record
            }
        }
    }
    
    // Process each country
    for (let country of _.keys(countryData)) {
        let countryInfo = countryData[country]
        let countryResult = {}
        
        // Extract time series for different metrics
        const toBillions = d => {
            if (_.isNil(d) || d === '') return null
            let num = parseFloat(d)
            return isNaN(num) ? null : num * 1e9
        }
        
        const identity = d => {
            if (_.isNil(d) || d === '') return null
            let num = parseFloat(d)
            return isNaN(num) ? null : num
        }
        
        // Find and extract relevant time series
        for (let [key, info] of _.entries(countryInfo)) {
            const record = info.record
            const sector = info.sector
            const valuation = info.valuation
            const measure = info.measure
            const adjustment = info.adjustment
            
            // Extract time series data (columns that look like dates)
            let timeSeries = {}
            let times = []
            
            for (let [col, val] of _.entries(record)) {
                // Skip metadata columns
                if (['FREQ', 'Frequency', 'BORROWERS_CTY', 'Borrowers\' country', 
                     'TC_BORROWERS', 'Borrowing sector', 'TC_LENDERS', 'Lending sector',
                     'VALUATION', 'Valuation method', 'UNIT_TYPE', 'Unit type',
                     'TC_ADJUST', 'Adjustment', 'UNIT_MULT', 'Unit Multiplier',
                     'UNIT_MEASURE', 'Unit of measure', 'TITLE_TS', 'Series'].includes(col)) {
                    continue
                }
                
                // Parse date format like "2023-Q4"
                if (/^\d{4}-Q[1-4]$/.test(col)) {
                    times.push(col)
                    timeSeries[col] = val
                }
            }
            
            // Map time series to metrics based on sector, valuation, and measure
            if (sector === 'Private non-financial sector' && 
                valuation === 'Market value' && 
                adjustment === 'Adjusted for breaks') {
                
                if (measure === 'US dollar') {
                    if (!countryResult.privateDebtUsd) {
                        countryResult.privateDebtUsd = _.map(times, t => {
                            let v = timeSeries[t]
                            return v ? parseFloat(v) * 1e9 : null
                        })
                    }
                } else if (measure === 'Per cent') {
                    if (!countryResult.privateDebtPercent) {
                        countryResult.privateDebtPercent = _.map(times, t => {
                            let v = timeSeries[t]
                            return v ? parseFloat(v) : null
                        })
                    }
                } else if (measure === 'New Zealand dollar' || measure === 'Euro' ||
                    measure === 'Japanese yen' || measure === 'British pound' || measure === 'Canadian dollar' ||
                    measure === 'Australian dollar' || measure === 'Swiss franc' || measure === 'Swedish krona' ||
                    measure === 'Norwegian krone' || measure === 'Danish krone' || measure === 'Polish zloty' ||
                    measure === 'Mexican peso' || measure === 'Brazilian real' || measure === 'Chinese yuan' ||
                    measure === 'Indian rupee' || measure === 'Malaysian ringgit' || measure === 'Singapore dollar' ||
                    measure === 'Hong Kong dollar' || measure === 'Thai baht' || measure === 'South African rand' ||
                    measure === 'Russian ruble' || measure === 'Saudi riyal' || measure === 'Turkish lira') {
                    if (!countryResult.privateDebt) {
                        countryResult.privateDebt = _.map(times, t => {
                            let v = timeSeries[t]
                            return v ? parseFloat(v) * 1e9 : null
                        })
                    }
                }
            } else if (sector === 'General government' && 
                       valuation === 'Market value' && 
                       adjustment === 'Adjusted for breaks') {
                
                if (measure === 'US dollar') {
                    if (!countryResult.publicDebtUsd) {
                        countryResult.publicDebtUsd = _.map(times, t => {
                            let v = timeSeries[t]
                            return v ? parseFloat(v) * 1e9 : null
                        })
                    }
                } else if (measure === 'Per cent') {
                    if (!countryResult.publicDebtPercent) {
                        countryResult.publicDebtPercent = _.map(times, t => {
                            let v = timeSeries[t]
                            return v ? parseFloat(v) : null
                        })
                    }
                } else if (measure !== 'Per cent' && measure !== 'US dollar') {
                    if (!countryResult.publicDebt) {
                        countryResult.publicDebt = _.map(times, t => {
                            let v = timeSeries[t]
                            return v ? parseFloat(v) * 1e9 : null
                        })
                    }
                }
            } else if (sector === 'Households & NPISHs' && 
                       valuation === 'Market value' && 
                       adjustment === 'Adjusted for breaks') {
                
                if (measure === 'US dollar') {
                    if (!countryResult.householdDebtUsd) {
                        countryResult.householdDebtUsd = _.map(times, t => {
                            let v = timeSeries[t]
                            return v ? parseFloat(v) * 1e9 : null
                        })
                    }
                } else if (measure === 'Per cent') {
                    if (!countryResult.householdDebtPercent) {
                        countryResult.householdDebtPercent = _.map(times, t => {
                            let v = timeSeries[t]
                            return v ? parseFloat(v) : null
                        })
                    }
                } else if (measure !== 'Per cent' && measure !== 'US dollar') {
                    if (!countryResult.householdDebt) {
                        countryResult.householdDebt = _.map(times, t => {
                            let v = timeSeries[t]
                            return v ? parseFloat(v) * 1e9 : null
                        })
                    }
                }
            }
        }
        
        // Convert quarter dates to time format
        if (countryData[country][_.keys(countryData[country])[0]]) {
            let firstRecord = countryData[country][_.keys(countryData[country])[0]].record
            let times = []
            for (let col of _.keys(firstRecord)) {
                if (/^\d{4}-Q[1-4]$/.test(col)) {
                    times.push(col)
                }
            }
            
            countryResult.times = _.map(times, t => {
                let parts = t.split('-Q')
                let year = parseInt(parts[0])
                let quarter = parseInt(parts[1])
                return year + (quarter - 1) / 4
            })
        }
        
        // Apply same post-processing as Excel version
        if (countryResult.times && countryResult.times.length > 0) {
            countryResult = removeBlankValues(countryResult)
            
            // For countries that only report in USD (like US), copy USD fields to domestic fields
            if (!countryResult.privateDebt && countryResult.privateDebtUsd) {
                countryResult.privateDebt = countryResult.privateDebtUsd
            }
            if (!countryResult.householdDebt && countryResult.householdDebtUsd) {
                countryResult.householdDebt = countryResult.householdDebtUsd
            }
            if (!countryResult.publicDebt && countryResult.publicDebtUsd) {
                countryResult.publicDebt = countryResult.publicDebtUsd
            }
            
            // Apply the same computed fields
            if (countryResult.privateDebt && countryResult.householdDebt) {
                countryResult.commercialDebt = combine(
                    countryResult.privateDebt,
                    countryResult.householdDebt,
                    (a, b) => a - b
                )
            }
            if (countryResult.privateDebt && countryResult.privateDebtPercent) {
                countryResult.gdp = combine(
                    countryResult.privateDebt,
                    countryResult.privateDebtPercent,
                    (a, b) => (a / b) * 100
                )
            }
            if (countryResult.privateDebtUsd && countryResult.privateDebtPercent) {
                countryResult.gdpUsd = combine(
                    countryResult.privateDebtUsd,
                    countryResult.privateDebtPercent,
                    (a, b) => (a / b) * 100
                )
            }
            if (countryResult.gdp || countryResult.gdpUsd) {
                countryResult.gdpPercent = _.map(countryResult.times, t => 100)
            }
            if (countryResult.commercialDebt && countryResult.gdp) {
                countryResult.commercialDebtPercent = combine(
                    countryResult.commercialDebt,
                    countryResult.gdp,
                    (a, b) => (a / b) * 100
                )
            }
            if (countryResult.gdp) {
                countryResult.gdpChange = diff(countryResult.gdp)
            }
            if (countryResult.privateDebtPercent && countryResult.publicDebtPercent) {
                countryResult.allDebtPercent = combine(
                    countryResult.privateDebtPercent,
                    countryResult.publicDebtPercent,
                    (a, b) => a + b
                )
            }
            if (countryResult.privateDebtPercent) {
                countryResult.creditPercent = diff(countryResult.privateDebtPercent)
            }
            if (countryResult.privateDebt) {
                countryResult.credit = diff(countryResult.privateDebt)
            }
            if (countryResult.gdpChange && countryResult.credit) {
                countryResult.keenGrowth = combine(countryResult.gdpChange, countryResult.credit, (a, b) => a + b)
            }
            if (countryResult.privateDebtUsd && countryResult.householdDebtUsd) {
                countryResult.commercialDebtUsd = combine(
                    countryResult.privateDebtUsd,
                    countryResult.householdDebtUsd,
                    (a, b) => a - b
                )
            }
            
            result[country] = countryResult
        }
    }
    
    return result
}

function getDebtByCountry (xlsxFname) {
    let bis = new BisXls(xlsxFname)
    let result = {}
    for (let country of bis.getCountries()) {
        result[country] = bis.getCountry(country)
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
    try {
        await downloadFile(populationUrl, populationXls)
        const populationData = getPopulationByCountry(populationXls)
        const populationJson = './src/countries/population.json'
        fs.writeFileSync(populationJson, JSON.stringify(populationData))
        console.log(`Save ${populationJson}`)
    } catch (err) {
        console.error('Warning: Could not download population data from World Bank:', err.message)
        console.log('Using existing population.json')
    }

    // Download from new BIS data portal
    // Available at https://data.bis.org/bulkdownload
    const debtUrl = 'https://data.bis.org/static/bulk/WS_TC_csv_col.zip'
    const debtZip = './src/countries/totcredit.zip'
    await downloadFile(debtUrl, debtZip)
    
    // Extract and read the CSV file from the zip
    const path = require('path')
    const extract = require('extract-zip')
    const extractDir = path.resolve('./src/countries/totcredit_extracted')
    try {
        await extract(debtZip, { dir: extractDir })
        console.log('Extracted zip file')
    } catch (err) {
        console.error('Error extracting zip:', err)
        throw err
    }
    
    // Check what files are in the extracted directory
    const files = fs.readdirSync(extractDir)
    console.log('Files in extracted directory:', files)
    
    let debtData = {}
    
    // Try to parse CSV first (new format)
    const csvFiles = files.filter(f => f.endsWith('.csv'))
    if (csvFiles.length > 0) {
        try {
            const csvFile = `${extractDir}/${csvFiles[0]}`
            console.log(`Using new CSV format: ${csvFile}`)
            debtData = getDebtByCountryCsv(csvFile)
        } catch (err) {
            console.error('Error parsing CSV format, trying Excel format:', err.message)
            // Fall back to Excel if CSV parsing fails
            debtData = null
        }
    }
    
    // Fall back to Excel format (old format) if CSV parsing failed or no CSV found
    if (_.isEmpty(debtData)) {
        console.log('Using legacy Excel format')
        let debtXlsx = './src/countries/totcredit.xlsx'
        if (!fs.existsSync(debtXlsx)) {
            // Try to find Excel file in extracted directory
            const xlsxFiles = files.filter(f => f.endsWith('.xlsx'))
            if (xlsxFiles.length > 0) {
                debtXlsx = `${extractDir}/${xlsxFiles[0]}`
            } else {
                throw new Error('No XLSX file found in extracted data')
            }
        }
        debtData = getDebtByCountry(debtXlsx)
    }
    
    const populationJson = './src/countries/population.json'
    addPopulation(debtData, populationJson)

    const dataJson = './src/countries/data.json'
    fs.writeFileSync(dataJson, JSON.stringify(debtData))
    console.log(`Save ${dataJson}`)
}

run()
