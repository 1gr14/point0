import { Route0, Routes } from '@devp0nt/route0'

const home = Route0.create('/')
const empty = home.extend('/empty')
const sharedEmpty = empty.extend('/shared')
const ideas = home.extend('/ideas')
const newIdea = ideas.extend('/new')
const idea = ideas.extend('/:id')
const ideaNews = idea.extend('/news')

export const routes = Routes.create({
  home,
  empty,
  sharedEmpty,
  ideas,
  newIdea,
  idea,
  ideaNews,
})
