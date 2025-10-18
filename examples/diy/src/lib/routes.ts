import { Route0 } from '@devp0nt/route0'

const home = Route0.create('/')
const ideas = home.extend('/ideas')
const idea = ideas.extend('/:id')
const ideaNews = idea.extend('/news')

export const routes = {
  home,
  ideas,
  idea,
  ideaNews,
}
