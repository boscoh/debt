<template lang="pug">
.d-flex.flex-row(:key="renderHook").flex-grow-1
    .px-4.pb-4.flex-grow-1.d-flex.flex-column.text-start.overflow-auto
        h1.m-0 {{ title }}
        .w-100(v-for="(chart, i) of charts" :key="i")
            h4 {{ chart.title }}
            div(v-html="chart.html")
            vue3-chart-js.w-100(v-bind="chart")
    .d-flex.flex-column.border.p-3.m-4(style="width: 10em")
        .form-check.text-start(v-for="s in checkBoxes")
            input.form-check-input(
                type="checkbox" v-model="s.checked" @change="build"
            )
            .form-check-label {{ s.country }}
</template>
`
`

<script>
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import _ from 'lodash'
import Vue3ChartJs from '@j-t-mcc/vue3-chartjs'
import dataByCountry from '../countries/data.json'
import { assignTimeSeriesDataToChart } from '../chartUtil'

function random () {
    return (Math.random() + 1).toString(36).substring(7)
}

function getCountryProperty (countries, property, times) {
    let timeValueByCountry = {}

    for (let country of countries) {
        let timeValue = {}
        let countryTimes = dataByCountry[country].times
        let values = dataByCountry[country][property]
        for (let [t, v] of _.zip(countryTimes, values)) {
            timeValue[t] = v
        }
        timeValueByCountry[country] = timeValue
    }

    let dataByKey = { times }
    for (let country of countries) {
        dataByKey[country] = []
        for (let t of times) {
            let v = null
            if (t in timeValueByCountry[country]) {
                v = timeValueByCountry[country][t]
                if (v === 0) {
                    v = null
                }
            }
            dataByKey[country].push(v)
        }
    }
    return dataByKey
}

function makeComparisonChart (countries, property, title) {
    let times = []
    for (let country of countries) {
        times = _.concat(times, dataByCountry[country].times)
    }
    times = _.sortBy(_.uniq(times))
    let dataByKey = getCountryProperty(countries, property, times)
    countries = _.sortBy(countries, country => -_.last(dataByKey[country]))
    let finalCountries = []
    for (let country of countries) {
        if (_.some(dataByKey[country], x => !_.isNil(x))) {
            finalCountries.push(country)
        }
    }
    finalCountries.push('GDP')
    dataByKey.GDP = _.map(times, t => 100)
    return {
        title: `${title} (%GDP)`,
        markdown: '',
        keys: finalCountries,
        times: times,
        dataByKey: dataByKey,
        ymin: 0,
        xmin: 1990,
        xmax: _.max(times),
        xlabel: 'Year',
        ylabel: '%',
        renderHook: random(),
    }
}

const selectedCountries = [
    'Australia',
    'Belgium',
    'Canada',
    'China',
    'Denmark',
    'France',
    'Germany',
    'Greece',
    'Ireland',
    'Italy',
    'Japan',
    'Korea',
    'New Zealand',
    'United Kingdom',
    'United States',
]

let checkBoxes = _.map(_.keys(dataByCountry), country => ({
    country,
    checked: _.includes(selectedCountries, country),
}))

export default {
    name: 'PopModel',
    components: { Vue3ChartJs },
    props: ['name'],
    data () {
        return {
            title: '',
            checkBoxes,
            charts: [],
        }
    },
    mounted () {
        this.build()
    },
    methods: {
        build () {
            this.title = 'International Comparisons'
            let selectedCountries = _.map(
                _.filter(this.checkBoxes, c => c.checked),
                'country'
            )
            this.charts = [
                makeComparisonChart(
                    selectedCountries,
                    'householdDebtPercent',
                    'Household (mostly Housing) Debt'
                ),
                makeComparisonChart(
                    selectedCountries,
                    'commercialDebtPercent',
                    'Commercial Debt'
                ),
                makeComparisonChart(
                    selectedCountries,
                    'publicDebtPercent',
                    'Public Debt'
                ),
                makeComparisonChart(
                    selectedCountries,
                    'privateDebtPercent',
                    'Private Debt (Commercial & Household)'
                ),
                makeComparisonChart(
                    selectedCountries,
                    'allDebtPercent',
                    'All Debt'
                ),
            ]
            for (let chart of this.charts) {
                chart.options.plugins.legend.position = 'right'

                let times = chart.times
                let dataByKey = chart.dataByKey
                assignTimeSeriesDataToChart(chart, times, dataByKey)

                let dataset = _.find(chart.data.datasets, {label: 'GDP'})
                dataset.borderWidth = 8
                dataset.borderColor = '#333333' + '33'
                // dataset.fill = 'origin'
                // dataset.backgroundColor = dataset.borderColor + '33'
            }
            this.renderHook = random()
        },
    },
}
</script>
