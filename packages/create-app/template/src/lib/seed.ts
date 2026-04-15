export const seed = async () => {
  // delete all data
  await Promise.all([])

  // create all data
  await Promise.all([])
}

if (import.meta.main) {
  seed()
    .then(() => {
      console.info(`Seeded successfully.`)
    })
    .catch((error) => {
      console.error('Seed failed.', error)
      process.exitCode = 1
    })
}
