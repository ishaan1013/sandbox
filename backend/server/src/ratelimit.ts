import { RateLimiterMemory } from "rate-limiter-flexible"

export const saveFileRL = new RateLimiterMemory({
  points: 3,
  duration: 1,
})

export const createFileRL = new RateLimiterMemory({
  points: 3,
  duration: 1,
})

export const renameFileRL = new RateLimiterMemory({
  points: 3,
  duration: 1,
})

export const deleteFileRL = new RateLimiterMemory({
  points: 3,
  duration: 1,
})
