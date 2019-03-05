const xlsx = require('node-xlsx').default
const fs = require('fs')
const path = require('path')
const db = require('./db')
const crypto = require('crypto')

let pgClient
async function main () {
  pgClient = await db.getClient()

  const reportsFolder = `${__dirname}/reports/`
  const reports = fs.readdirSync(reportsFolder)
    .filter(f => f.endsWith('.xls'))
    .map(f => `${path.join(reportsFolder, f)}`)
    .map(extractTransactions)

  for (const report of reports) {
    const existingHashes = await getHashesFromDb(pgClient)

    const filteredTransactions = report.filter(t => {
      const hash = md5('' + Number(t.timestamp) / 1000 + t.card + t.description + t.amount)
      return !existingHashes.includes(hash)
    })

    await importReportToDB(pgClient, filteredTransactions)
  }

  await pgClient.query(`
    DELETE FROM transaction
    WHERE description LIKE '%Перевод со своей карты%'
    OR description LIKE '%Перевод на свою карту%'
    OR description LIKE '%Бонус Плюс%'
  `)
}

function extractTransactions (xlsxFile) {
  const err = cur => {
    throw new Error('unknown currency', cur)
  }
  return xlsx.parse(xlsxFile)[0]['data']
    .filter(d => d[0] && d[0].match(/^(\d{1,2}).(\d{1,2}).(\d{4})$/))
    .map(t => ({
      timestamp: new Date(t[0].split('.').reverse().join('-') + ' ' + t[1] + '+00'),
      category: t[2],
      card: t[3].match(/\*{4}(\d{4})/)[1],
      description: t[4],
      currency:
        t[6] === 'грн' ? 'UAH'
          : t[6] === 'руб' ? 'RUB'
            : t[6] === 'долл' ? 'USD'
              : err(t[6]),
      amount: t[5],
      tags: t[11] ? t[11].split(',') : []
    }))
}

async function getHashesFromDb (pgClient) {
  const sql = `
    SELECT md5(extract(epoch from timestamp) || card || description || amount) as hash FROM transaction
  `
  return (await pgClient.query(sql)).rows.map(r => r.hash)
}

async function importReportToDB (pgClient, report) {
  for (const transaction of report) {
    const sql = `
      INSERT INTO transaction (timestamp, category, card, description, currency, amount, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
    await pgClient.query(sql, [
      transaction.timestamp,
      transaction.category,
      transaction.card,
      transaction.description,
      transaction.currency,
      transaction.amount,
      transaction.tags
    ])
  }
}

function md5 (string) {
  return crypto.createHash('md5').update(string).digest('hex')
}

main().then(exit).catch(exit)

function exit (e) {
  pgClient.end()
  if (e) {
    console.log(e)
    process.exit(1)
  }
}
