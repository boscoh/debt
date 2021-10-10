<template lang="pug">
.p-4.pt-0.d-flex.flex-column.text-start(style="max-width: 850px")
    h1.mt-2.mb-0 {{ title }}
    .mt-0(v-for="(chart, i) of charts" :key="i")
        h4 {{ chart.title }}
        div(v-html="chart.html")
        vue3-chart-js(
            v-bind="chart"
        )
</template>

<script>
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import _ from 'lodash'
import Vue3ChartJs from '@j-t-mcc/vue3-chartjs'
import countryLayouts from '../countries/index'
import { assignTimeSeriesDataToChart } from '../chartUtil'

export default {
    name: 'CountryCharts',
    components: { Vue3ChartJs },
    props: ['name'],
    data () {
        return {
            title: '',
            link: '',
            charts: [],
        }
    },
    mounted () {
        this.build(this.name)
    },
    methods: {
        build (name) {
            this.layout = _.find(countryLayouts, { name })
            this.title = this.layout.title
            this.charts = this.layout.charts
            for (let chart of this.charts) {
                assignTimeSeriesDataToChart(
                    chart,
                    this.layout.times,
                    this.layout.dataByKey
                )
                let dataset = _.find(chart.data.datasets, {label: 'Gdp Percent'})
                if (dataset) {
                    dataset.borderWidth = 0
                    dataset.label = ''
                    dataset.borderColor = '#AAAAAA'
                    dataset.fill = 'origin'
                    dataset.backgroundColor = dataset.borderColor + '33'
                }
            }
        },
    },
}
</script>
