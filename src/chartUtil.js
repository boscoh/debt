import _ from "lodash";
import dedent from "dedent";
import MarkdownIt from "markdown-it";
import mk from "markdown-it-katex";

export const md = new MarkdownIt({html: true})
md.use(mk)

export const defaultOptions = {
    plugins: {
        legend: {
            display: true,
            position: 'top',
            labels: {usePointStyle: true},
        },
        tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            usePointStyle: true
        },
    },
    responsive: true,
    scales: {
        xAxis: {
            display: true,
            type: 'linear',
            position: 'bottom',
            ticks: {},
        },
        yAxis: {
            display: true,
            type: 'linear',
            ticks: {},
        },
    },
}
const colors = [
    '#4ABDAC', // fresh
    '#FC4A1A', // vermilion
    '#F78733', // sunshine
    '#037584', // starry night
    '#007849', // iris
    '#FAA43A', // orange
    '#60BD68', // green
    '#F17CB0', // pink
    '#B2912F', // brown
    '#B276B2', // purple
    '#DECF3F', // yellow
    '#F15854', // red
    '#C08283', // pale gold
    '#dcd0c0', // silk
    '#E37222', // tangerine
]
const seenNames = []

export function getColor(name) {
    let i = seenNames.indexOf(name)
    if (i < 0) {
        seenNames.push(name)
        i = seenNames.length - 1
    }
    return colors[i % colors.length]
}

export function buildDataset(name, xValues, yValues, color) {
    return {
        label: _.startCase(name),
        data: _.map(_.zip(xValues, yValues), v => ({x: v[0], y: v[1]})),
        fill: false,
        backgroundColor: color,
        borderColor: color,
        showLine: true,
        pointStyle: 'line',
        pointRadius: 0,
        borderWidth: 2,
    }
}

const millifyNames = ['', 'k', 'm', 'b', 't']

export function millify(value) {
    let isPositive = value > 0
    value = Math.abs(parseFloat(value))
    let i = Math.floor(value === 0 ? 0 : Math.log10(Math.abs(value)) / 3)
    i = _.parseInt(i)
    const iLast = millifyNames.length - 1
    i = Math.max(0, Math.min(iLast, i))
    const unit = millifyNames[i]
    let x = value / 10 ** (3 * i)
    if (x < 10) {
        x = x.toFixed(1)
    } else {
        x = _.parseInt(x)
    }
    if (!isPositive) {
        x = -1 * x
    }
    return `${x}${unit}`
}

export const dollar = x => `$${millify(x)}`
export const str = t => `${t}`

export function assignTimeSeriesDataToChart(chart, times, dataByKey) {
    chart.type = 'scatter'
    chart.html = md.render(dedent(chart.markdown))
    let options = _.cloneDeep(defaultOptions)
    if (chart.xlabel) {
        options.scales.xAxis.title = {
            display: true,
            text: chart.xlabel,
        }
    }
    if (chart.ylabel) {
        options.scales.yAxis.title = {
            display: true,
            text: chart.ylabel,
        }
    }
    options.scales.xAxis.ticks.callback = str
    let xAxis = options.scales.xAxis
    if ('xmin' in chart) {
        xAxis.min = chart.xmin
    }
    if ('xmax' in chart) {
        xAxis.max = chart.xmax
    }
    let yAxis = options.scales.yAxis
    if ('ymin' in chart) {
        yAxis.min = chart.ymin
    }
    if ('ymax' in chart) {
        yAxis.max = chart.ymax
    }
    yAxis.ticks.callback = millify
    options.plugins.tooltip.callbacks = {
        label: ctx =>
            ` ${ctx.dataset.label} ${chart.ylabel}${millify(ctx.raw.y)} in ${str(
                ctx.raw.x
            )} `,
    }
    chart.options = options

    const keys = _.get(chart, 'keys', [])
    let biggest = 0
    let datasets = []
    for (let key of keys) {
        let dataset = buildDataset(
            key,
            times,
            dataByKey[key],
            getColor(key)
        )
        if (_.every(dataByKey[key], _.isNil)) {
            dataset.label += " [NO DATA]"
        }
        if (chart.isUp) {
            dataset.fill = 'origin'
            dataset.borderWidth = 1
            dataset.backgroundColor = dataset.borderColor + '44'
        }
        if (chart.isSymmetryY) {
            let maxV = _.max(dataByKey[key])
            let minV = _.min(dataByKey[key])
            biggest = _.max([
                Math.abs(maxV),
                Math.abs(minV),
                biggest,
            ])
        }
        datasets.push(dataset)
    }
    chart.data = {datasets}
    if (chart.isSymmetryY) {
        chart.options.scales.yAxis.max = biggest
        chart.options.scales.yAxis.min = -biggest
    }
}