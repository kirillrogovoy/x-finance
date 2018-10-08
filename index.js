const xlsx = require('node-xlsx').default
const reportsFolder = `${__dirname}/reports/`
const fs = require('fs')
const fetch = require('node-fetch')

async function main () {
  let initialReportsList = []

  fs.readdirSync(reportsFolder).forEach(file => {
    if (file.match(/.+\.xlsx/)) {
      initialReportsList.push(xlsx.parse(reportsFolder + file))
    }
  })

  let reports = []
  let reportsKeys = []

  initialReportsList.forEach(function (element) {
    element[0].data.forEach(function (element) {
      if (element[0] === 'Дата') {
        reportsKeys.push(element)
      }
    })
  })
  reportsKeys = reportsKeys[0] // 11
  let reportsKeysCounter = 0
  let obj = {}

  initialReportsList.forEach(function (element) {
    element[0].data.forEach(function (element, index) {
      if (
        element[0] !== undefined &&
                element[0].match(/^(\d{1,2}).(\d{1,2}).(\d{4})$/)
      ) {
        element.forEach(function (innerElement) {
          obj[reportsKeys[reportsKeysCounter]] = innerElement

          reportsKeysCounter++
          if (reportsKeysCounter === 11) {
            reportsKeysCounter = 0
            reports.push(obj)
            obj = {}
          }
        })
      }
    })
  })

  reports.forEach(function (element) {
    let date = element['Дата'].split('.').reverse().join('-')
    let time = element['Время']
    let dateAndTime = date + ' ' + time

    element['Дата'] = new Date(dateAndTime)
    delete element['Время']
  })

  reports.sort(function (a, b) {
    return a['Дата'] - b['Дата']
  })

  for (let element of reports) {
    let neededDate =
            ('0' + element['Дата'].getDate()).slice(-2) + '.' +
            ('0' + element['Дата'].getMonth()).slice(-2) + '.' +
            element['Дата'].getFullYear()

    if (element['Валюта карты'] === 'руб' || element['Валюта карты'] === 'долл') {
      let rate =
                await fetch('https://api.privatbank.ua/p24api/exchange_rates?json&date=' + neededDate)
                  .then(res => res.json())

      let rub = rate.exchangeRate.find(function (element) {
        return element.currency === 'RUB'
      }).saleRateNB

      let usd = rate.exchangeRate.find(function (element) {
        return element.currency === 'USD'
      }).saleRateNB

      // let rub = 0.40
      // let usd = 0.26

      if (element['Валюта карты'] === 'руб') { element['Сумма в гривнах'] = element['Сумма в валюте карты'] * rub }
      if (element['Валюта карты'] === 'долл') { element['Сумма в гривнах'] = element['Сумма в валюте карты'] * usd }
    }
    element['Сумма в гривнах'] = element['Сумма в валюте карты']
  }

  let statistics = {}

  reports.forEach(function (element) {
    if (element['Сумма в гривнах'] < 0) {
      if (!statistics.hasOwnProperty(element['Категория'])) {
        statistics[element['Категория']] = element['Сумма в гривнах']
      } else {
        statistics[element['Категория']] += element['Сумма в гривнах']
      }
    }
  })
  for (const element in statistics) {
    statistics[element] = Math.ceil(statistics[element]) * -1
  }

  let statisticsArray = []
  for (const element in statistics) {
    statisticsArray.push({
      category: element,
      amount: statistics[element]
    })
  }

  statisticsArray.sort(function (a, b) {
    return b['amount'] - a['amount']
  })

  let newStatistics = {}
  statisticsArray.forEach(function (element) {
    newStatistics[element.category] = element.amount
  })

  console.log(newStatistics)
}

main()
