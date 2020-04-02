import { setup, cleanup } from './test-helpers'

setup(false).then(() => {
  console.log('Tables created')
  console.log('They will be removed upon existing this script gracefully.')
  process.on('SIGTERM', async () => {
    await cleanup()
    console.log('Dropping tables')
    process.exit(1)
  })
  process.on('SIGINT', async () => {
    await cleanup()
    console.log('Dropping tables')
    process.exit(1)
  })
}).catch(console.log)
