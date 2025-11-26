# International Debt Visualization

An interactive web application for visualizing and comparing national debt levels across countries over time. This project provides historical data on public and private debt, GDP, and related economic indicators from 48 countries.

**Live Demo:** <https://boscoh.com/debt>

## About

This visualization tool helps understand long-term debt trends by comparing:

- **Private Debt** (household and commercial debt)
- **Public Debt** (government debt)
- **GDP** and GDP per capita
- Historical trends from 1940s to present

The project draws on economic research showing that private debt levels are a key driver of economic cycles and financial crises. By making this data accessible and visual, the tool helps identify patterns and trends across different countries and time periods.

## Quick Start

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Visit `http://localhost:3000` to view the application.

### Production Build

Build the production Single Page Application in `dist/`:

```bash
npm run build
```

## Data Pipeline

### Refreshing Data

To update with the latest data from BIS and World Bank:

```bash
node fetch-data.cjs
```

This script:
1. Downloads population data from World Bank → `src/countries/population.json`
2. Downloads debt statistics from BIS → extracts and processes CSV
3. Calculates derived metrics (commercial debt, GDP, per capita values)
4. Generates `src/countries/data.json` with all processed data

### Data Sources

**Primary Data:**

- **Bank of International Settlements (BIS)** - Total Credit Statistics
  - Main page: <https://www.bis.org/statistics/about_credit_stats.htm?m=6%7C380>
  - Bulk download: <https://data.bis.org/bulkdownload>
  - Direct URL: <https://data.bis.org/static/bulk/WS_TC_csv_col.zip>
  - Provides: Private debt, public debt, household debt (% of GDP and absolute values)

- **World Bank** - Population Data (SP.POP.TOTL)
  - API: <https://api.worldbank.org/v2/en/indicator/SP.POP.TOTL?downloadformat=excel>
  - Provides: Annual population for per capita calculations

### Data Processing

The raw data is processed to calculate additional metrics:

- **Commercial Debt** = Private Debt - Household Debt
- **GDP** = (Private Debt / Private Debt %) × 100
- **Per Capita Values** = GDP / Population
- **Growth Rates** = Period-over-period changes in debt and GDP

All debt data is sourced from "All sectors" lending to avoid double-counting from individual lending sectors.

## Technical Stack

### Frontend
- **Vue 3** - Reactive UI framework
- **Chart.js** - Interactive time-series charts via `@j-t-mcc/vue3-chartjs`
- **Bootstrap 5** - Responsive UI components and styling
- **Vite** - Fast build tool and dev server

### Data Processing
- **Node.js** - Data fetching and processing
- **SheetJS (xlsx)** - Excel file parsing
- **csv-parse** - CSV parsing for BIS SDMX format
- **Lodash** - Data manipulation utilities

## Project Structure

```
debt/
├── src/
│   ├── components/
│   │   ├── Home.vue           # Main comparison charts
│   │   ├── CountryCharts.vue  # Individual country view
│   │   └── DropdownMenu.vue   # Navigation
│   ├── countries/
│   │   ├── data.json          # Processed debt/GDP data
│   │   └── population.json    # Population time series
│   ├── chartUtil.js           # Chart configuration helpers
│   └── main.js                # Vue app entry
├── fetch-data.cjs             # Data pipeline script
└── README.md
```

## Understanding the Data

### Debt Categories

**Private Debt** includes all credit to the non-financial private sector:
- **Household Debt** - Mortgages and consumer credit
- **Commercial Debt** - Business loans and corporate bonds

**Public Debt** includes credit to general government at all levels.

### Why Private Debt Matters

Economic research (notably by economist Steve Keen) shows that changes in private debt are a major driver of economic demand. Rapid private debt growth can fuel booms, while debt reduction (deleveraging) can trigger recessions. This makes private debt levels a crucial economic indicator alongside traditional measures like GDP and unemployment.

## Useful Resources

### Economic Research & Analysis

- **Private Debt Project** - Research on debt's role in economic cycles
  - ["Are We Facing a Global Lost Decade?"](https://privatedebtproject.org/pdp/view-articles.php?Are-We-Facing-a-Global-Lost-Decade-14)

### Additional Data Sources

- **Reserve Bank of Australia (RBA)**
  - [Statistical tables](https://www.rba.gov.au/statistics/frequency/occ-paper-8.html#section_5)
  - [Historical GDP data](https://www.rba.gov.au/statistics/tables/xls/h01hist.xls)

- **FRED (Federal Reserve Economic Data)**
  - [Australia GDP](https://fred.stlouisfed.org/series/AUSGDPNQDSMEI)

- **Other Resources**
  - [Country Economy](https://countryeconomy.com/gdp/australia?year=2019)
  - [Macrotrends](https://www.macrotrends.net/countries/AUS/australia/gdp-growth-rate)
  - [World Bank Indicators](https://data.worldbank.org/indicator/FS.AST.PRVT.GD.ZS?locations=AU)

## Contributing

Data updates run quarterly as BIS releases new statistics. To contribute or report issues with data processing, please check the data pipeline logic in `fetch-data.cjs`.

## License

Data sources remain under their respective licenses (BIS and World Bank). Application code is provided as-is for educational and research purposes.
