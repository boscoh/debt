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

    node fetch-data.cjs

This will build `src/countries/population.json`, which has population data, and
`src/countries/data.json` which has all the debt data.

### Primary Data Sources

**Debt Data:**
- Bank of International Settlements (BIS) - Total Credit Statistics
  - Main page: <https://www.bis.org/statistics/about_credit_stats.htm?m=6%7C380>
  - Bulk download portal: <https://data.bis.org/bulkdownload>
  - Direct download: <https://data.bis.org/static/bulk/WS_TC_csv_col.zip>
  - Format: CSV (SDMX columnar format)

**Population Data:**
- World Bank - Population Indicator (SP.POP.TOTL)
  - API URL: <https://api.worldbank.org/v2/en/indicator/SP.POP.TOTL?downloadformat=excel>
  - Format: Excel

### Useful Resources & Articles

**Debt Analysis & Theory:**
- Private Debt Project - "Are We Facing a Global Lost Decade?" 
  - <https://privatedebtproject.org/pdp/view-articles.php?Are-We-Facing-a-Global-Lost-Decade-14>
  - Analysis of private debt as a driver of economic cycles

**Country-Specific Data Sources:**
- Reserve Bank of Australia (RBA) Statistics
  - Statistical tables: <https://www.rba.gov.au/statistics/frequency/occ-paper-8.html#section_5>
  - Historical GDP data: <https://www.rba.gov.au/statistics/tables/xls/h01hist.xls>
- FRED (Federal Reserve Economic Data)
  - Australia GDP: <https://fred.stlouisfed.org/series/AUSGDPNQDSMEI>

**Additional Reference Sites:**
- Country Economy: <https://countryeconomy.com/gdp/australia?year=2019>
- Macrotrends: <https://www.macrotrends.net/countries/AUS/australia/gdp-growth-rate>
- World Bank Indicators: <https://data.worldbank.org/indicator/FS.AST.PRVT.GD.ZS?locations=AU>

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

