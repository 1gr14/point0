// A stable, pure nickname → color mapping used everywhere a nickname is shown (chat authors,
// presence avatars, board dots). Same input always yields the same hue, on both server and client.
export const colorForNickname = (nickname: string): string => {
  let hash = 0
  for (let i = 0; i < nickname.length; i++) {
    hash = (hash << 5) - hash + nickname.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 70% 45%)`
}
