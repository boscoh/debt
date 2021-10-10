# Data Visualisation of National Debt

Running visualization <https://boscoh.com/debt>

## Quick Start

    npm install

Run dev server

    npm run dev

Build production SPA in `dist`:

    npm run build

## Refresh data

The data is pulled in from the Bank of International Settlement and the World Bank:

    node fetch-data.js

This will build `src/countries/population.json`, which has population data, and
`src/countriesdata.json` which has all the debt data.

The source URL for debt data is
<https://www.bis.org/statistics/about_credit_stats.htm?m=6%7C380>.

The source URL for population data is
<https://api.worldbank.org/v2/en/indicator/SP.POP.TOTL?downloadformat=excel>.

## App architecture

- Vue 3 framework
- plots with chart.js
- UI and utility CSS from Bootstrap 5
- spreadsheet analysis with sheet.js
- currency from currency-symbol-map & country-codes-list 

## Data analysis

Debt, GDP and Debt percentages are taken from the Bank of International 
Settlement. Debt is broken up into Public and Private debt. Household
debt is considered one part of the Private debt, and Commercial Debt
is calculated as the remainder.

Changes in Debt, GDP etc. are calculated from this data.

Per capita calculation uses population from the World Bank.

## Data analysis

Javascript has sufficiently good tools for data-analysis from Excel spreadsheet
sources, where the resultant JSON slots nicely into a front-end framework.

