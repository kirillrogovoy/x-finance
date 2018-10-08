const fetch = require('node-fetch')
const dayjs = require('dayjs')
const fs = require('fs')
const path = require('path')
const db = require('./db')

const ratesDir = path.join(__dirname, 'rates')
const startDate = dayjs(new Date('01.01.2018'))
const endDateString = dayjs().format('DD.MM.YYYY')

let pgClient
async function main () {
  let curDate = startDate
  pgClient = await db.getClient()

  while (true) {
    const curDateString = curDate.format('DD.MM.YYYY')
    const filePath = path.join(ratesDir, `${curDateString}.json`)
    console.log('downloading for ', curDateString)
    if (!fs.existsSync(filePath)) {
      const url = `https://api.privatbank.ua/p24api/exchange_rates?json&date=${curDateString}`
      console.log('fetching', url)
      const rates = await fetch(url)
      console.log('writing')
      fs.writeFileSync(filePath, await rates.text())
    } else {
      console.log('file exists')
    }

    const savedRates = require(filePath)

    console.log('deleting old records')
    await pgClient.query(`DELETE FROM exchange_rate WHERE date = $1`, [curDate.format('YYYY-MM-DD')])

    const ratesToImport = savedRates.exchangeRate.filter(r => r.purchaseRate !== undefined)
    for (let rate of ratesToImport) {
      await pgClient.query(`
        INSERT INTO exchange_rate ("date", "from", "to", "rate")
        VALUES ($1, $2, $3, $4)
      `, [
        curDate.format('YYYY-MM-DD'),
        rate.currency,
        'UAH',
        rate.purchaseRate
      ])
    }

    await pgClient.query(`
      INSERT INTO exchange_rate ("date", "from", "to", "rate") VALUES ($1, 'UAH', 'UAH', 1)
    `, [ curDate.format('YYYY-MM-DD') ]
    )

    console.log('----')

    if (curDateString === endDateString) {
      break
    }

    curDate = curDate.add(1, 'day')
  }
}

main().then(exit).catch(exit)

function exit (e) {
  pgClient.end()
  if (e) {
    console.log(e)
    process.exit(1)
  }
}
