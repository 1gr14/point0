import { minimatch } from 'minimatch'

export type ImporterOptionsInput = {
  mock?: Array<string | RegExp>
  deny?: Array<string | RegExp>
  exitOnDeny?: boolean
}

export type ImporterOptionsParsed = {
  mock: Array<RegExp>
  deny: Array<RegExp>
  exitOnDeny?: boolean
}

export const stringWithAsterisksToRegexes = (str: string): RegExp => {
  const normalized = str.trim().replace(/\\/g, '/')
  const regex = minimatch.makeRe(normalized, { dot: true })
  if (!regex) {
    throw new Error(`Invalid glob pattern: "${str}"`)
  }
  return regex
}

export const stringsAndRegexesToRegexes = (strings: Array<string | RegExp>): Array<RegExp> => {
  return strings.map((string) => {
    if (typeof string === 'string') {
      return stringWithAsterisksToRegexes(string)
    }
    return string
  })
}

// export const stringsAndRegexesToPoisitiveAndNegativeRegexes = (
//   strings: Array<string | RegExp>,
// ): { positive: Array<RegExp>; negative: Array<RegExp> } => {
//   const positive: Array<RegExp> = []
//   const negative: Array<RegExp> = []
//   for (const string of strings) {
//     if (typeof string === 'string') {
//       if (string.startsWith('!')) {
//         negative.push(stringWithAsterisksToRegexes(string.slice(1)))
//       } else {
//         positive.push(stringWithAsterisksToRegexes(string))
//       }
//     } else {
//       positive.push(string)
//     }
//   }
//   return { positive, negative }
// }

export const parseImporterOptions = (options: ImporterOptionsInput): ImporterOptionsParsed => {
  return {
    mock: stringsAndRegexesToRegexes(options.mock ?? []),
    deny: stringsAndRegexesToRegexes(options.deny ?? []),
    exitOnDeny: options.exitOnDeny,
  }
}
