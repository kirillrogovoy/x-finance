const { Client: PostgresClient } = require('pg')

exports.getClient = async function () {
  const pgClient = new PostgresClient({
    host: 'localhost',
    port: 15432,
    user: 'postgres',
    password: '111',
    database: 'xfinance'
  })
  await pgClient.connect()
  return pgClient
}
